# Universidad Tecnológica Nacional

### Tecnicatura Universitaria en Programación

**Alumnos**:

- Alexis
- Joel

**Ejecución**

Crear el archivo `.env` basado en `.env.example` y completar las variables de entorno

```shell
cp .env.example .env
```

Construir y ejecutar el contenedor de la API

```shell
docker compose up -d --build
```

Probar el endpoint del healt check

```shell
curl http://localhost:8080/actuator/health
```
**Autenticación**

Los endpoints protegidos requieren `Authorization: Bearer <accessToken>`. El token se obtiene con `POST /api/auth/login` usando el email y la contraseña de un usuario registrado (por ejemplo, un entrenador creado con `POST /api/coaches`). En Swagger UI se carga desde el botón **Authorize** (`bearerAuth`).

**Desarrollo local (solo la base de datos en Docker)**

Para desarrollar no hace falta levantar el contenedor de la app: alcanza con levantar solo el servicio `postgres` del `docker-compose.yml` y correr la API desde el IDE o con Gradle.

1. Levantar solo la base de datos

```shell
docker compose up -d postgres
```

2. Verificar que el contenedor esté `healthy`

```shell
docker compose ps postgres
```

3. Ejecutar la API localmente (perfil `dev`, se conecta a `localhost:5432`)

```shell
./gradlew bootRun
```

Spring no lee el archivo `.env`. Si en `.env` cambiaste usuario, contraseña, base o puerto respecto a los valores por defecto, exportá las variables antes de ejecutar la API (todas las variables del `.env` tienen que tener valor; una variable vacía pisa el valor por defecto de Spring):

```shell
set -a && source .env && set +a
./gradlew bootRun
```

Detener la base de datos

```shell
docker compose stop postgres
```

Borrar la base de datos y empezar de cero (elimina el volumen con los datos)

```shell
docker compose down -v
```

**Autenticación (JWT)**

La API es stateless: cada request protegida lleva un access token JWT en el header `Authorization: Bearer <token>`. Hay una sola sesión activa por usuario: iniciar sesión en otro dispositivo cierra la anterior.

| Endpoint | Acceso | Descripción |
|---|---|---|
| `POST /api/auth/login` | público | Recibe `email` y `password`. Devuelve `accessToken` (15 min), `refreshToken` (2 h), el rol y los datos del usuario |
| `POST /api/auth/refresh` | público | Recibe `refreshToken`. Devuelve un par nuevo; el refresh token usado deja de servir |
| `GET /api/auth/me` | con token | Datos del usuario autenticado |
| `POST /api/auth/logout` | con token | Revoca el refresh token de la sesión; responde 204, también si ya estaba cerrada |

Variables de entorno:

- `JWT_SECRET`: clave de firma, mínimo 32 bytes. **Obligatoria en prod** (sin ella la app no arranca). En dev hay un valor por defecto. Generarla con `openssl rand -base64 32`.
- `JWT_ACCESS_TOKEN_TTL` (por defecto `15m`) y `JWT_REFRESH_TOKEN_TTL` (por defecto `2h`).
- `CORS_ALLOWED_ORIGINS`: orígenes del front que pueden llamar a la API desde el navegador, separados por coma y sin barra final (ej. `https://app.ejemplo.com`). **Obligatoria en prod**; en dev, `http://localhost:5173`. Un origen que no está en la lista recibe 403.

Probar desde Swagger (http://localhost:8080/swagger-ui.html):

1. Registrar un entrenador con `POST /api/coaches`.
2. `POST /api/auth/login` con ese email y contraseña, y copiar el `accessToken`.
3. Botón **Authorize**: pegar el `accessToken` (sin el prefijo `Bearer`).
4. `GET /api/auth/me` devuelve los datos del usuario.
5. `POST /api/auth/refresh` con el `refreshToken` devuelve un par nuevo; repetirlo con el refresh token viejo responde 401.
6. `POST /api/auth/logout` responde 204 y revoca el refresh token. Repetirlo también responde 204; el refresh posterior responde 401.

**Roles y pertenencia**

Cada endpoint declara en `SecurityConfig` qué rol lo puede usar: sin token responde 401 y con un rol que no corresponde, 403. Además, los datos de un atleta pasan por `AthleteAccessGuard`: un entrenador solo accede a sus atletas y un atleta solo a sus propios datos (si no, 403; si el atleta no existe, 404).

| Endpoint | Sin token | COACH | ATHLETE |
|---|---|---|---|
| `POST /api/coaches` · `POST /api/auth/login` · `POST /api/auth/refresh` | público | público | público |
| `GET /api/auth/me` · `POST /api/auth/logout` | 401 | ✓ | ✓ |
| `POST /api/athletes` | 401 | ✓ | 403 |
| `GET /api/athletes` | 401 | ✓ solo sus atletas | 403 |
| `GET /api/athletes/{id}` | 401 | ✓ solo sus atletas | ✓ solo él mismo |
| `PUT /api/athletes/{id}` · `DELETE /api/athletes/{id}` · `PATCH /api/athletes/{id}/unlink` | 401 | ✓ solo sus atletas | 403 |
| `POST /api/athletes/{id}/deactivate` · `POST /api/athletes/{id}/reactivate` | 401 | ✓ solo sus atletas | 403 |

`GET /api/athletes` ("Mis atletas") devuelve los atletas vinculados al entrenador autenticado, ordenados por apellido y nombre, con el formato paginado común `PageResponse`: `{ content, page, size, totalElements, totalPages }`. Query params opcionales: `page` (desde 0), `size` (20 por defecto, máximo 100), `name` (nombre, apellido o "nombre apellido") y `goal`; los filtros de texto no distinguen mayúsculas y se combinan con AND.

Gestión del atleta (US-07), solo para su entrenador:
- `PUT /api/athletes/{id}` edita todos sus datos (mismos campos que el alta, sin `password`; los opcionales que no se envían quedan en null). Email de otro usuario → 409.
- `POST /api/athletes/{id}/deactivate` y `/reactivate` cambian `active`: un atleta desactivado no puede iniciar sesión ni refrescar su sesión, pero sigue en "Mis atletas".
- `PATCH /api/athletes/{id}/unlink` lo desvincula (204): el atleta y su historial quedan en la base con `coachId = null`, deja de aparecer en "Mis atletas" y el entrenador recibe 403 al consultarlo. Su cuenta no se modifica.
- `DELETE /api/athletes/{id}` lo elimina (204) con baja lógica: la fila, sus datos y su historial quedan en la base (`users.deleted_at`), pero la aplicación no lo ve más (`@SQLRestriction` en `User`): sale de "Mis atletas", cualquier operación sobre él responde 404, no puede iniciar sesión (se borran sus refresh tokens) y su email queda libre para un alta nueva (índice único parcial de la V2).

Para agregar un endpoint:

1. Si no es para los dos roles, su regla en `SecurityConfig` (`hasRole("COACH")` o `hasRole("ATHLETE")`). La regla corre antes de leer el body: un rol equivocado recibe 403 aunque el body sea inválido.
2. Si toca datos de un atleta, `AthleteAccessGuard.verifyAccess(user, athleteId)` en el service (no solo en el controller). `AuthenticatedUser.from(jwt)` arma el usuario desde el token.
3. Su fila en `RoleEndpointMatrixE2ETest`: el test falla si hay un endpoint sin fila.

**Tests**

Los tests de integración y e2e usan [Testcontainers](https://testcontainers.com/): levantan su propio PostgreSQL en un contenedor temporal, así que **Docker tiene que estar corriendo**. No hace falta levantar el `docker-compose.yml` ni tocan la base de desarrollo.

Ejecutar todos los tests (unitarios, integración y e2e)

```shell
./gradlew test
```

Ejecutar solo los tests e2e (paquete `e2e`: levantan la API completa en un puerto aleatorio y la prueban por HTTP)

```shell
./gradlew test --tests 'com.gestion_deportiva.api.e2e.*'
```

Ejecutar una sola clase o un solo test

```shell
./gradlew test --tests 'com.gestion_deportiva.api.e2e.CoachE2ETest'
./gradlew test --tests 'com.gestion_deportiva.api.e2e.CoachE2ETest.shouldReturn409WhenEmailAlreadyRegisteredIgnoringCase'
```

El reporte con el resultado de cada test queda en `build/reports/tests/test/index.html`.
