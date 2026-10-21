# Guía de contribución

Este documento define cómo trabajamos en el backend de **Gestión Deportiva**. Todo cambio que llegue a `main` tiene que respetar estas reglas.

## Índice

1. [Estrategia de ramificación: GitHub Flow](#1-estrategia-de-ramificación-github-flow)
2. [Pull Requests](#2-pull-requests)
3. [Tests unitarios](#3-tests-unitarios)
4. [Tests end-to-end (e2e)](#4-tests-end-to-end-e2e)
5. [DER (Diagrama Entidad-Relación)](#5-der-diagrama-entidad-relación)
6. [README](#6-readme)
7. [Idioma y convenciones](#7-idioma-y-convenciones)
8. [Checklist antes de crear el PR](#8-checklist-antes-de-crear-el-pr)

---

## 1. Estrategia de ramificación: GitHub Flow

Usamos **GitHub Flow**:

- `main` es la única rama de larga duración y **siempre debe compilar y tener todos los tests en verde**.
- Todo cambio se hace en una **rama corta** creada desde `main`.
- La rama vuelve a `main` únicamente a través de un **Pull Request** revisado.
- No se hacen commits directos a `main`.

### Nombre de las ramas

```
<tipo>/<numero-issue>-<descripcion-corta-en-kebab-case>
```

| Tipo        | Uso                                          |
|-------------|----------------------------------------------|
| `feat/`     | Nueva funcionalidad                          |
| `fix/`      | Corrección de un bug                         |
| `refactor/` | Cambio interno sin modificar comportamiento  |
| `test/`     | Solo agrega o corrige tests                  |
| `docs/`     | Documentación (README, DER, Swagger, etc.)   |
| `config/`   | Configuración, dependencias, Docker, CI      |

Si no hay Issue asociado se omite el número: `docs/contributing`.

### Ejemplo paso a paso

Supongamos que hay que implementar el login (Issue #12).

**1. Actualizar `main`**

```shell
git checkout main
git pull origin main
```

**2. Crear la rama**

```shell
git checkout -b feat/12-login-jwt
```

**3. Desarrollar con commits pequeños y descriptivos**

Formato del mensaje: `<tipo>: <descripción>` (los mismos tipos de la tabla anterior).

```shell
git add src/main/java/com/gestion_deportiva/api/service/AuthService.java
git commit -m "feat: servicio de autenticación con JWT"

git add src/test/java/com/gestion_deportiva/api/service/AuthServiceTest.java
git commit -m "test: casos borde y de error del login"
```

**4. Mantener la rama al día con `main`** (si `main` avanzó mientras trabajabas)

```shell
git fetch origin
git rebase origin/main
# resolver conflictos si los hay, luego:
git push --force-with-lease
```

**5. Verificar localmente** que compila y que todos los tests pasan (ver [checklist](#8-checklist-antes-de-crear-el-pr)).

```shell
./gradlew clean build
```

**6. Subir la rama**

```shell
git push -u origin feat/12-login-jwt
```

**7. Abrir el Pull Request contra `main`** (ver [sección 2](#2-pull-requests)).

**8. Revisión**: el otro integrante revisa, comenta y aprueba. Los cambios pedidos se suben como nuevos commits en la misma rama.

**9. Merge**: una vez aprobado, se mergea con **Squash and merge** y se borra la rama.

```shell
git checkout main
git pull origin main
git branch -d feat/12-login-jwt
```

---

## 2. Pull Requests

- Todo PR se crea **contra `main`**.
- Si el cambio resuelve un Issue, el PR **debe vincularlo** con una palabra clave (`Closes`, `Fixes` o `Resolves`) para que el Issue se cierre automáticamente al mergear.
- Un PR = un objetivo. Si el PR crece demasiado, dividirlo.
- El título sigue el mismo formato que los commits: `<tipo>: <descripción>`.

### Ejemplo de PR

**Título**

```
feat: login con JWT y refresh token
```

**Descripción**

```markdown
## Descripción
Implementa el endpoint `POST /api/auth/login` que devuelve un access token (JWT)
y un refresh token persistido en base de datos.

Closes #12

## Cambios
- `AuthController` y `AuthService` con la lógica de login.
- `JwtService` para firmar y validar tokens.
- Respuesta 401 con el formato de error estándar ante credenciales inválidas.

## Criterios de aceptación
- [x] Con credenciales válidas devuelve 200 con `accessToken` y `refreshToken`.
- [x] Con contraseña incorrecta devuelve 401.
- [x] Con usuario inexistente devuelve 401 (mismo mensaje, no revela si existe).
- [x] Con body inválido devuelve 400 con el detalle de los campos.

## Cómo probarlo
1. `docker compose up -d --build`
2. Abrir Swagger en http://localhost:8080/swagger-ui.html
3. Ejecutar `POST /api/auth/login` con un usuario de prueba.

## Checklist
- [x] La app compila (`./gradlew clean build`)
- [x] Tests unitarios pasan
- [x] Tests e2e pasan
- [x] DER actualizado (no aplica)
- [x] README actualizado (no aplica)
```

Desde la terminal con [GitHub CLI](https://cli.github.com/):

```shell
gh pr create --base main --title "feat: login con JWT y refresh token" --body-file pr.md
```

---

## 3. Tests unitarios

Se escriben tests unitarios para los **puntos críticos** de la aplicación:

- Lógica de negocio en servicios.
- Validaciones y reglas de dominio en entidades.
- Manejo de excepciones y formato de errores.
- Seguridad (autenticación, autorización, tokens).
- Cualquier cálculo, conversión o transformación de datos.

Cada funcionalidad crítica debe cubrir:

| Tipo de caso    | Ejemplo                                                                |
|-----------------|------------------------------------------------------------------------|
| **Camino feliz**| Registro con datos válidos crea el usuario.                            |
| **Casos borde** | String vacío, `null`, longitudes máximas/mínimas, listas vacías, fechas límite, valores en 0 o negativos. |
| **Casos de error** | Email ya registrado lanza `EmailAlreadyRegisteredException`; entidad inexistente lanza la excepción correspondiente. |

Convenciones:

- Ubicación: `src/test/java/...`, replicando el paquete de la clase testeada.
- Nombre de la clase: `<ClaseTesteada>Test` (ej. `AthleteTest`, `GlobalExceptionHandlerTest`).
- Nombre de los métodos descriptivo del comportamiento, en inglés: `shouldThrowWhenEmailAlreadyRegistered()`.
- Estructura **Arrange / Act / Assert**.
- Los tests unitarios no levantan el contexto de Spring ni la base de datos; las dependencias se mockean.
- Los datos de prueba reutilizables van en `support/` (ej. `IdentityFixtures`).

Para tests de integración con base de datos real se extiende `AbstractIntegrationTest` (PostgreSQL vía Testcontainers + migraciones Flyway, con rollback automático por test).

Ejecutar:

```shell
./gradlew test
```

> Los tests de integración y e2e usan Testcontainers: **Docker debe estar corriendo**.

---

## 4. Tests end-to-end (e2e)

Los tests e2e verifican un flujo completo **a través de la API HTTP**, tal como lo usaría un cliente: request → controller → service → repository → base de datos → response.

- Se escriben para cada endpoint nuevo o modificado y para los flujos principales (ej. registro → login → acceso a recurso protegido).
- Levantan la aplicación completa con `@SpringBootTest(webEnvironment = RANDOM_PORT)` y PostgreSQL real con Testcontainers.
- Validan **código de estado HTTP, body de respuesta y efectos en la base de datos**.
- Cubren también los errores esperados: 400 (validación), 401 (no autenticado), 403 (sin permisos), 404 (no encontrado), 409 (conflicto).
- Nombre de la clase: `<Recurso>E2ETest` (ej. `AuthE2ETest`), en el paquete `e2e`.
- Cada test debe ser independiente: no depender del orden de ejecución ni de datos dejados por otro test.

Ejemplo de estructura:

```java
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Import(TestcontainersConfiguration.class)
class AuthE2ETest {

    @Test
    void shouldReturn401WhenPasswordIsWrong() {
        // Arrange: usuario registrado
        // Act: POST /api/auth/login con contraseña incorrecta
        // Assert: status 401 y body con el formato de error estándar
    }
}
```

---

## 5. DER (Diagrama Entidad-Relación)

Si el cambio modifica el modelo de datos, **el DER se actualiza en el mismo PR**. Aplica cuando:

- Se agrega o elimina una tabla/entidad.
- Se agrega, elimina o renombra una columna.
- Cambia una relación, clave foránea, cardinalidad o restricción (`unique`, `not null`, etc.).

Todo cambio de esquema se hace con una **nueva migración Flyway** en `src/main/resources/db/migration` (`V<n>__descripcion.sql`). **Nunca se modifica una migración ya mergeada en `main`.**

El DER se mantiene en `docs/` y debe reflejar el estado del esquema luego de la última migración.

---

## 6. README

El `README.md` se actualiza en el mismo PR cuando el cambio afecta a cómo se usa o se levanta el proyecto, por ejemplo:

- Nuevas variables de entorno (también actualizar `.env.example`).
- Cambios en los pasos de instalación, build o ejecución.
- Nuevos servicios en `docker-compose.yml`.
- Nuevos comandos o scripts útiles.

---

## 7. Idioma y convenciones

| Elemento                                                           | Idioma                       |
|--------------------------------------------------------------------|------------------------------|
| Variables, métodos, clases, paquetes, enums, constantes            | **Inglés**                   |
| Clases de excepción                                                | **Inglés**                   |
| Texto de los mensajes que recibe el cliente (errores, validaciones) | **Castellano**               |
| Tablas, columnas y migraciones de base de datos                    | **Inglés**                   |
| Endpoints y campos de JSON                                         | **Inglés**                   |
| Nombres de tests                                                   | **Inglés**                   |
| Comentarios en el código                                           | Castellano o inglés          |
| Mensajes de commit, títulos y descripciones de PR                  | Castellano o inglés          |

```java
// Correcto
public class AthleteService {
    // Valida que el email no esté registrado antes de crear el atleta
    public Athlete register(CreateAthleteRequest request) { ... }
}

// Incorrecto
public class ServicioAtleta {
    public Atleta registrar(CrearAtletaRequest solicitud) { ... }
}
```

Los nombres (clases, métodos, campos) van en inglés, pero el **texto** del mensaje que llega al cliente va en castellano para que el frontend pueda mostrarlo directamente:

```java
// Correcto: clase en inglés, mensaje en castellano
public class EmailAlreadyRegisteredException extends ConflictException {
    public EmailAlreadyRegisteredException(String email) {
        super("Ya existe un usuario registrado con el email " + email);
    }
}

// Lo mismo aplica a los mensajes de Bean Validation
@NotBlank(message = "El email es obligatorio")
String email;
```

---

## 8. Checklist antes de crear el PR

Antes de abrir el Pull Request, verificar que:

- [ ] La nueva funcionalidad **cumple todos los criterios de aceptación** del Issue.
- [ ] **La app compila** sin errores.
- [ ] **Todos los tests unitarios pasan.**
- [ ] **Todos los tests e2e pasan.**
- [ ] Se agregaron tests unitarios para los puntos críticos, con casos borde y de error.
- [ ] Se agregaron tests e2e para los endpoints/flujos nuevos o modificados.
- [ ] DER actualizado (si aplica).
- [ ] README actualizado (si aplica).
- [ ] Código en inglés según la [sección 7](#7-idioma-y-convenciones).
- [ ] La rama está actualizada con `main`.

Comando para verificar compilación y tests de una sola vez (requiere Docker corriendo):

```shell
./gradlew clean build
```

Si alguno de estos puntos no se cumple, el PR **no se abre** hasta resolverlo.
