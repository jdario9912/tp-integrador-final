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
| `GET /api/muscle-groups` | 401 | ✓ | 403 |
| `GET /api/exercises` · `POST /api/exercises` · `GET /api/exercises/{id}` | 401 | ✓ globales y propios | 403 |
| `PUT /api/exercises/{id}` · `DELETE /api/exercises/{id}` | 401 | ✓ solo los propios | 403 |
| `POST /api/routines` · `GET /api/routines` · `GET /api/routines/{id}` | 401 | ✓ solo las propias | 403 |
| `POST /api/athletes/{athleteId}/weights` · `PUT /api/athletes/{athleteId}/weights/{weightId}` | 401 | 403 | ✓ solo él mismo |
| `GET /api/athletes/{athleteId}/weights` | 401 | ✓ solo sus atletas | ✓ solo él mismo |

`GET /api/athletes` ("Mis atletas") devuelve los atletas vinculados al entrenador autenticado, ordenados por apellido y nombre, con el formato paginado común `PageResponse`: `{ content, page, size, totalElements, totalPages }`. Query params opcionales: `page` (desde 0), `size` (20 por defecto, máximo 100), `name` (nombre, apellido o "nombre apellido") y `goal`; los filtros de texto no distinguen mayúsculas y se combinan con AND.

Gestión del atleta (US-07), solo para su entrenador:
- `PUT /api/athletes/{id}` edita todos sus datos (mismos campos que el alta, sin `password`; los opcionales que no se envían quedan en null). Email de otro usuario → 409.
- `POST /api/athletes/{id}/deactivate` y `/reactivate` cambian `active`: un atleta desactivado no puede iniciar sesión ni refrescar su sesión, pero sigue en "Mis atletas".
- `PATCH /api/athletes/{id}/unlink` lo desvincula (204): el atleta y su historial quedan en la base con `coachId = null`, deja de aparecer en "Mis atletas" y el entrenador recibe 403 al consultarlo. Su cuenta no se modifica.
- `DELETE /api/athletes/{id}` lo elimina (204) con baja lógica: la fila, sus datos y su historial quedan en la base (`users.deleted_at`), pero la aplicación no lo ve más (`@SQLRestriction` en `User`): sale de "Mis atletas", cualquier operación sobre él responde 404, no puede iniciar sesión (se borran sus refresh tokens) y su email queda libre para un alta nueva (índice único parcial de la V2).

Catálogo de ejercicios (US-38), solo para entrenadores:
- `GET /api/muscle-groups` lista los 12 grupos musculares precargados: `{ code, name, region }` (`region`: `UPPER`, `CORE`, `LOWER` o `FULL`).
- `GET /api/exercises` devuelve los ejercicios del sistema (precargados por la V3, `global: true`) y los del entrenador autenticado, ordenados por nombre y con el formato `PageResponse`. Query params opcionales: `page`, `size`, `name` (contiene, sin distinguir mayúsculas) y `muscleGroup` (código).
- `POST /api/exercises` lo crea a nombre del entrenador (201): `name` y `muscleGroup` obligatorios, `description` y `videoUrl` (http/https) opcionales. Nombre repetido en su catálogo, sin distinguir mayúsculas → 409; puede repetir el nombre de un global o de otro entrenador.
- `PUT /api/exercises/{id}` edita todos sus datos (los opcionales que no se envían quedan en null). Un global o uno de otro entrenador → 403.
- `DELETE /api/exercises/{id}` lo elimina (204) con baja lógica (`exercises.deleted_at`): sale del catálogo y su nombre queda libre, pero las rutinas que lo usan lo siguen referenciando.

Rutinas (US-13), solo para entrenadores:
- `POST /api/routines` la crea a nombre del entrenador (201): `name` obligatorio; `description`, `goal`, `daysPerWeek` (1 a 7), `durationWeeks` (1 a 52) e `isTemplate` (plantilla reutilizable, `false` por defecto) opcionales. Nombre repetido entre sus rutinas, sin distinguir mayúsculas → 409; puede repetir el nombre de una rutina de otro entrenador.
- `GET /api/routines` ("Mis rutinas") devuelve solo las del entrenador autenticado, ordenadas por nombre y con el formato `PageResponse`. Query params opcionales: `page` y `size`.
- `GET /api/routines/{id}` devuelve una rutina propia. La de otro entrenador → 403.

Registros de peso (US-26): el atleta registra y corrige su peso; él y su entrenador lo consultan. Los registros no se borran: uno equivocado se corrige con `PUT`.
- `POST /api/athletes/{athleteId}/weights` registra el peso de un día (201, sin header `Location`): `date` (`YYYY-MM-DD`, no futura) y `weightKg` (de 20 a 300, hasta 2 decimales) obligatorios; `comment` opcional (máximo 500 caracteres; se recorta y, vacío, queda en null). Solo el propio atleta: el entrenador recibe 403 aunque el atleta sea suyo. Hay un registro por día: si la fecha ya tiene uno → 409 "Ya existe un registro de peso para el DD/MM/AAAA".
- `PUT /api/athletes/{athleteId}/weights/{weightId}` lo corrige (edición completa: el comentario que no se envía queda en null). Mover el registro a una fecha que ya tiene otro → 409. Un registro de otro atleta responde 404, igual que uno inexistente.
- `GET /api/athletes/{athleteId}/weights` los lista del más reciente al más antiguo con el formato `PageResponse`, para el propio atleta (también si está desvinculado) y para su entrenador. Query params opcionales: `from` y `to` (`YYYY-MM-DD`, inclusivos; `from` posterior a `to` → 400), `page` y `size`. Con `size=1` devuelve el último peso (ficha del entrenador).
- "Hoy" se calcula en la zona horaria de la app y no en UTC (a las 22:00 de Argentina en UTC ya es el día siguiente). Variable `APP_TIME_ZONE`: ID IANA, por defecto `America/Argentina/Buenos_Aires`; si está vacía se usa ese valor, y un valor inválido no deja arrancar la app.

Para agregar un endpoint:

1. Si no es para los dos roles, su regla en `SecurityConfig` (`hasRole("COACH")` o `hasRole("ATHLETE")`). La regla corre antes de leer el body: un rol equivocado recibe 403 aunque el body sea inválido.
2. Si toca datos de un atleta, `AthleteAccessGuard.verifyAccess(user, athleteId)` en el service (no solo en el controller). `AuthenticatedUser.from(jwt)` arma el usuario desde el token.
3. Su fila en `RoleEndpointMatrixE2ETest`: el test falla si hay un endpoint sin fila.

**Almacenamiento de fotos (Supabase Storage)**

Las fotos de progreso (US-28) se guardan en un bucket **privado** de Supabase Storage. La US-37 dejó lista la base: el puerto `ObjectStorage` (`upload`, `createSignedUrl`, `delete`) y su adaptador `SupabaseObjectStorage`, que usa la API REST de Storage con `RestClient` (sin dependencias nuevas). Todavía no hay endpoints: los agrega US-28.

Flujo elegido para US-28:

1. **Subida a través del backend**: el front manda la imagen en multipart a la API; el backend valida formato y tamaño y la sube a Supabase con la clave `service_role` (`POST /storage/v1/object/{bucket}/{ruta}`). El navegador nunca habla directo con Supabase ni conoce la clave.
2. **En la base se guarda la ruta del objeto** (ej. `progress/<athleteId>/<uuid>.jpg`), nunca la URL firmada.
3. **Lectura con URL firmada**: cada vez que se piden las fotos, el backend genera una URL nueva (`POST /storage/v1/object/sign/{bucket}/{ruta}` con `expiresIn`) y responde `url` + `expiresAt`. Sin firma, el objeto no es accesible (ni por la ruta pública ni por la autenticada sin token).
4. **Renovación**: una URL vencida responde error (400 de Supabase). El front no la renueva por su cuenta: vuelve a pedir el recurso a la API (en TanStack Query, `staleTime` menor que el vencimiento y reintento desde el `onError` de la imagen).

Errores: si Supabase no responde (timeout de conexión 5 s, de lectura 15 s), rechaza la conexión, responde 4xx/5xx o no está configurado, el adaptador lanza `StorageUnavailableException` y la API responde **503** con el formato `ApiErrorResponse` y un mensaje genérico ("El servicio de almacenamiento no está disponible..."). El detalle queda en el log, sin la clave.

Variables de entorno (opcionales en dev: sin ellas la app arranca y el almacenamiento responde 503; **obligatorias en prod**):

- `SUPABASE_URL`: URL del proyecto, sin path (`https://<proyecto>.supabase.co`).
- `SUPABASE_SERVICE_ROLE_KEY`: clave `service_role` del proyecto. Es secreta: solo en `.env` o variables de entorno; nunca en el código, en logs ni en el front.
- `SUPABASE_STORAGE_BUCKET`: nombre del bucket privado.
- `STORAGE_SIGNED_URL_TTL`: vencimiento de las URLs firmadas (por defecto `10m`).

Prueba contra el Supabase real (`SupabaseObjectStorageRealIT`): sube un PNG chico a `poc/<uuid>.png`, comprueba que la URL firmada responde 200 antes de vencer y error después, que sin firma no se accede, y borra el objeto. No usa Spring ni Docker y **se saltea si no está `SUPABASE_URL`**. Para correrla, definir las tres variables en la terminal (Gradle no lee `.env`):

```shell
# bash
set -a && source .env && set +a
./gradlew test --tests 'com.gestion_deportiva.api.storage.SupabaseObjectStorageRealIT'
```

```powershell
# PowerShell
$env:SUPABASE_URL='https://<proyecto>.supabase.co'; $env:SUPABASE_SERVICE_ROLE_KEY='<clave>'; $env:SUPABASE_STORAGE_BUCKET='<bucket>'
.\gradlew.bat test --tests 'com.gestion_deportiva.api.storage.SupabaseObjectStorageRealIT'
```

Si el proyecto de Supabase está pausado por inactividad (plan gratuito), la prueba falla aunque el código esté bien: reactivarlo desde el panel.

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
