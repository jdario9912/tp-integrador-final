# Autenticación y autorización

Este documento describe cómo se autentica hoy la API y cómo migrar a JWT sin tocar los controllers ni los services.

## 1. Estado actual (provisorio): HTTP Basic contra la base

Mientras no exista el login con JWT, la API usa **HTTP Basic**: el cliente manda en cada request el header

```
Authorization: Basic base64(email:contraseña)
```

y Spring Security valida esas credenciales con los usuarios de la tabla `users` (por eso decimos "contra la base"). Antes de este cambio, Spring Boot creaba un usuario en memoria (`user` y una contraseña aleatoria que mostraba en el log). Ese usuario no existía en `users`, así que no servía para identificar a un entrenador.

### Piezas

| Clase | Rol | ¿Se mantiene con JWT? |
|---|---|---|
| `auth/service/DatabaseUserDetailsService` | Busca el usuario por email (sin importar mayúsculas) con `UserRepository.findByEmail` y lo convierte en `AuthenticatedUser` | **Sí**: el login lo usa para validar email y contraseña |
| `auth/security/AuthenticatedUser` | Principal del `SecurityContext`: `id`, `email`, `role`, `active`. Authority `ROLE_COACH` / `ROLE_ATHLETE` | **Sí**: el filtro JWT construye este mismo objeto |
| `PasswordEncoder` (BCrypt, en `SecurityConfig`) | Compara la contraseña recibida con `password_hash` | **Sí** |
| `SecurityConfig` | Reglas de acceso (`permitAll`, `hasRole`), `httpBasic`, `formLogin`, CSRF | **Cambia** (ver sección 3) |
| `OpenApiConfig` | Esquema `basicAuth` para el botón "Authorize" de Swagger | **Cambia**: pasa a `bearerAuth` |
| `test/.../support/AuthHeaders` | Arma el header de autenticación de los e2e | **Cambia**: hace login y usa `Bearer` |

### Flujo de una request protegida

```
Cliente ── POST /api/athletes + Authorization: Basic ... ──▶ BasicAuthenticationFilter
   │
   ├─ DaoAuthenticationProvider
   │     ├─ DatabaseUserDetailsService.loadUserByUsername(email)  → AuthenticatedUser (o 401)
   │     ├─ PasswordEncoder.matches(contraseña, passwordHash)     → 401 si no coincide
   │     └─ isEnabled() (users.active)                            → 401 si está desactivado
   │
   ├─ SecurityContext ← AuthenticatedUser
   ├─ AuthorizationFilter: hasRole("COACH")                       → 403 si es un atleta
   │
   └─ AthleteController.create(@AuthenticationPrincipal AuthenticatedUser coach, ...)
         └─ AthleteService.create(coach.getId(), request)         ← el service solo recibe el UUID
```

### Respuestas de error

Las genera `SecurityErrorHandler` con el formato estándar `ApiErrorResponse`.

| Status | Significado | Ejemplos |
|---|---|---|
| **401** Unauthorized | La API no sabe quién sos | Sin header `Authorization`, contraseña incorrecta, email inexistente, usuario desactivado |
| **403** Forbidden | La API sabe quién sos, pero no tenés permiso | Un **atleta** con credenciales válidas intenta `POST /api/athletes` (solo entrenadores) |

### Probarlo

1. Registrar un entrenador: `POST /api/coaches` (público).
2. En Swagger UI (`/swagger-ui.html`), entrar a **Authorize → basicAuth** con el email y la contraseña del entrenador.
3. Ejecutar `POST /api/athletes`.

Con curl:

```shell
curl -u ana@test.com:password123 -H 'Content-Type: application/json' \
  -d '{"firstName":"Leo","lastName":"Gil","email":"leo@test.com","password":"password123"}' \
  http://localhost:8080/api/athletes
```

## 2. Contrato que NO cambia al migrar

Estas reglas permiten cambiar el mecanismo de autenticación sin tocar el resto del código. Respetarlas también en las features nuevas:

1. **Los controllers obtienen al usuario solo con `@AuthenticationPrincipal AuthenticatedUser`**. No leen headers, ni `SecurityContextHolder`, ni objetos `Jwt`.
2. **Los services reciben ids (`UUID`) y nunca objetos de seguridad**. Ejemplo: `AthleteService.create(UUID coachId, CreateAthleteRequest request)`. Así los tests unitarios de los services no dependen de la autenticación.
3. **Las reglas de acceso por rol están en `SecurityConfig`** (`hasRole("COACH")`). Las verificaciones de pertenencia (por ejemplo, que un atleta sea de este entrenador) van en el service con el id recibido.
4. **Los e2e se autentican solo a través de `support/AuthHeaders`**.

## 3. Migración a JWT, paso a paso

### a. Dependencias

Opciones:

| Opción | Ventajas | Desventajas |
|---|---|---|
| `spring-boot-starter-oauth2-resource-server` (**recomendada**) | Validación del token (firma, `exp`) y filtro `BearerTokenAuthenticationFilter` resueltos por Spring; `NimbusJwtEncoder` para emitir tokens; menos código propio | Hay que entender el `JwtAuthenticationConverter` para devolver nuestro principal |
| Librería JWT (por ejemplo jjwt) + filtro propio (`OncePerRequestFilter`) | Control total y fácil de leer | Más código de seguridad propio que mantener y testear |

Con resource-server alcanza con una clave HMAC (`HS256`) configurada por variable de entorno. Si más adelante otro servicio necesita validar tokens, se puede pasar a RSA.

### b. Login: `POST /api/auth/login`

- Body: `{ "email", "password" }`. Es un endpoint público.
- Usa un `AuthenticationManager` con el **mismo** `DatabaseUserDetailsService` y `PasswordEncoder`. Se expone como bean, por ejemplo con `AuthenticationConfiguration#getAuthenticationManager()`.
- Si las credenciales son incorrectas: 401 con el mismo mensaje, exista o no el email, para no revelar qué usuarios hay.
- Si el login es correcto:
  - `user.recordLogin(now)`, que ya existe en `User`;
  - emitir el **access token** (duración corta, por ejemplo 15 minutos) con los claims `sub` = id del usuario, `email`, `role` y `exp`;
  - emitir un **refresh token** (ver punto c).
- Respuesta: `{ "accessToken", "refreshToken", "tokenType": "Bearer", "expiresIn" }`.

### c. Refresh tokens

La entidad `auth/model/RefreshToken` y `RefreshTokenRepository` **ya existen** (migración V1, tabla `refresh_tokens`).

- Se genera un valor aleatorio (por ejemplo 32 bytes con `SecureRandom`, en Base64URL). Al cliente se le devuelve ese valor y en la base se guarda **solo su hash SHA-256** (`token_hash`, 64 caracteres hex).
- `POST /api/auth/refresh` (público): busca por hash y comprueba `isActive(now)`. Si es válido, **rota** el token: revoca el actual (`revoke()`) y emite un access y un refresh nuevos.
- `POST /api/auth/logout`: revoca el refresh token recibido.
- Opcional: si llega un refresh token ya revocado (posible robo), revocar todos los tokens de ese usuario.

### d. Del token al `AuthenticatedUser`

Al validar el token, el filtro tiene que poner en el `SecurityContext` **el mismo `AuthenticatedUser`** que pone hoy httpBasic. Así `@AuthenticationPrincipal AuthenticatedUser` sigue funcionando en todos los controllers.

Con resource-server:

```java
// Ejemplo orientativo
@Bean
Converter<Jwt, AbstractAuthenticationToken> jwtAuthenticationConverter() {
    return jwt -> {
        AuthenticatedUser user = new AuthenticatedUser(
                UUID.fromString(jwt.getSubject()),
                jwt.getClaimAsString("email"),
                null,                                   // sin contraseña: el token ya se validó
                Role.valueOf(jwt.getClaimAsString("role")),
                true);
        return new UsernamePasswordAuthenticationToken(user, jwt, user.getAuthorities());
    };
}
```

Decisión pendiente: un usuario desactivado conserva un access token válido hasta que vence. Si eso no es aceptable, el converter puede consultar `users.active` en cada request, a costa de una query más. Con access tokens cortos, en general alcanza con no emitir refresh a usuarios inactivos.

### e. Cambios en `SecurityConfig`

```java
http
    .cors(Customizer.withDefaults())
    .csrf(AbstractHttpConfigurer::disable)            // API stateless con Bearer: no hay cookie que proteger
    .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
    .authorizeHttpRequests(auth -> auth
        .requestMatchers("/actuator/health/**").permitAll()
        .requestMatchers("/swagger-ui/**", "/swagger-ui.html", "/v3/api-docs/**").permitAll()
        .requestMatchers(HttpMethod.POST, COACH_REGISTRATION_PATH).permitAll()
        .requestMatchers(HttpMethod.POST, AUTH_LOGIN_PATH, AUTH_REFRESH_PATH).permitAll()
        .requestMatchers(HttpMethod.POST, ATHLETES_PATH).hasRole("COACH")   // las reglas por rol no cambian
        .anyRequest().authenticated())
    .oauth2ResourceServer(o -> o.jwt(j -> j.jwtAuthenticationConverter(jwtAuthenticationConverter())))
    .exceptionHandling(e -> e
        .authenticationEntryPoint(securityErrorHandler)   // token ausente, inválido o vencido → 401 estándar
        .accessDeniedHandler(securityErrorHandler));
// Se eliminan .formLogin(...) y .httpBasic(...), y los ignoringRequestMatchers puntuales de CSRF
```

`SecurityErrorHandler` se mantiene. Revisar que también se use como entry point del resource-server, para que el 401 conserve el formato `ApiErrorResponse` y no el `WWW-Authenticate` por defecto sin body.

### f. Configuración

Nuevas variables de entorno. Agregarlas a `.env.example`, `application*.yml` y `README.md`:

| Variable | Ejemplo | Nota |
|---|---|---|
| `JWT_SECRET` | 32 bytes o más en Base64 | Obligatoria; nunca commitear un valor real |
| `JWT_ACCESS_TOKEN_TTL` | `15m` | Duración del access token |
| `JWT_REFRESH_TOKEN_TTL` | `7d` | Duración del refresh token |

### g. Swagger

En `OpenApiConfig`, reemplazar el esquema `basicAuth` por:

```java
new SecurityScheme().type(SecurityScheme.Type.HTTP).scheme("bearer").bearerFormat("JWT")
```

y renombrar la constante a `BEARER_AUTH_SCHEME`. Los controllers protegidos la referencian con `@SecurityRequirement(name = ...)`.

### h. Tests

- **Unitarios de los services**: no cambian, porque reciben ids.
- **`DatabaseUserDetailsServiceTest`**: no cambia.
- **Nuevos unitarios**: emisión y validación de JWT, el converter `Jwt → AuthenticatedUser`, y la rotación y revocación de refresh tokens.
- **E2E**: cambiar `support/AuthHeaders.authenticate(...)` para que haga `POST /api/auth/login` y setee `Authorization: Bearer <accessToken>`. Los tests que ya existen (`AthleteE2ETest`, etc.) siguen igual.
- **Nuevos e2e (`AuthE2ETest`)**: login correcto, contraseña incorrecta (401), token vencido o adulterado (401), refresh con rotación, refresh revocado (401) y logout.

## 4. Archivos alcanzados por la migración

| Se modifica | No se modifica |
|---|---|
| `build.gradle` (dependencia) | `AuthenticatedUser` |
| `config/SecurityConfig` | `DatabaseUserDetailsService` |
| `config/OpenApiConfig` | Controllers y services de las features (`athlete`, `coach`, ...) |
| `support/AuthHeaders` (tests) | Tests unitarios de services |
| `application*.yml`, `.env.example`, `README.md` | E2E existentes (solo cambia el helper) |
| **Nuevos**: `auth/controller/AuthController`, `auth/service/AuthService` / `JwtService`, DTOs de login y refresh, `AuthE2ETest` | Migraciones Flyway (`refresh_tokens` ya existe en V1) |
