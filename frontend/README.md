# Universidad Tecnológica Nacional

### Tecnicatura Universitaria en Programación

**Alumnos**:

- Alexis Da Silva
- Joel Dario Muñoz

## Puesta en marcha

```bash
pnpm install
cp .env.example .env
pnpm dev
```

| Script          | Descripción                            |
| --------------- | -------------------------------------- |
| `pnpm dev`      | Servidor de desarrollo                 |
| `pnpm build`    | Typecheck + build de producción        |
| `pnpm test`     | Tests unitarios (Vitest)               |
| `pnpm test:e2e` | Tests E2E (Playwright)                 |
| `pnpm lint`     | Lint (oxlint)                          |
| `pnpm mock:api` | API mock (json-server, `mock/db.json`) |

### API mock (json-server)

`mock/db.json` está ignorado por git: cada uno crea el suyo. Cada clave es un recurso de la API.

```bash
mkdir -p mock
echo '{ "coaches": [] }' > mock/db.json
pnpm mock:api   # json-server en :3001, en otra terminal que pnpm dev
```

Limitaciones: no valida, no devuelve errores del backend, no autentica y solo sirve rutas de un nivel (`/recurso`, `/recurso/:id`). Lo que necesita rutas anidadas, paginación o login (pesos, rutina del atleta, sesiones, alimentos, comidas, notas, alertas, login, recuperación de contraseña) se prueba con el backend real (`API_PROXY_TARGET=http://localhost:8080/api`) o con los E2E.

### Tests E2E

Antes de la primera vez: `pnpm exec playwright install chromium`. Levantan su propio servidor en `:5174` e interceptan la API: no necesitan backend.

### Variables de entorno

Van en `.env` (ignorado por git); `.env.example` es la plantilla.

- `VITE_API_URL`: URL base del cliente. Por defecto `/api`. En producción, la URL absoluta del backend (con CORS).
- `API_PROXY_TARGET`: a dónde reenvía `/api` el servidor de desarrollo (sin el prefijo). json-server: `http://localhost:3001`; backend real: su URL con `/api`.

Vite las lee al arrancar: reiniciá `pnpm dev` después de cambiarlas.

## Arquitectura

### Flujo de datos

```
componente React -> hook (TanStack Query) -> acción -> cliente REST (axios)
```

- **Cliente REST** (`src/lib/api`): `get`, `post`, `put`, `patch`, `del` y `postForm` (multipart) tipados que devuelven el body. Los errores se normalizan a `ApiError` (`status: 0` = sin respuesta).
- **Acciones** (`src/pages/<modulo>/actions`): llaman al cliente REST.
- **Hooks** (`src/pages/<modulo>/hooks`): envuelven las acciones con `useQuery` / `useMutation`; es lo único que usan los componentes.
- **Datos compartidos** (`src/lib/<dominio>`): acciones, hooks y claves de caché que usan varias páginas (`athletes`, `weights`, `assignments`, `foods`, `training-sessions`, `notes`, `alerts`...). Las claves llevan el usuario y el atleta cuando corresponde, y las mutaciones invalidan por prefijo.
- **Decimales** (`src/lib/decimal.ts`): `normalizeDecimal` acepta coma decimal.
- **Fechas** (`src/lib/iso-date.ts`): las fechas `YYYY-MM-DD` se formatean en UTC; "hoy" y los instantes se calculan en `America/Argentina/Buenos_Aires`, como el backend.

```ts
// actions/create-coach.ts
export const createCoach = (input: CreateCoachInput) =>
  post<Coach, CreateCoachInput>('/coaches', input)

// hooks/use-create-coach.ts
export const useCreateCoach = () => useMutation({ mutationFn: createCoach })
```

Formularios: TanStack Form. Rutas: React Router (`src/router/AppRouter.tsx`). `src/App.tsx` solo compone los providers.

Iconos y navegación se importan desde `src/ui/icons` y `src/lib/navigation`, nunca directo de `lucide-react` o `react-router-dom` (lo controla oxlint; ver [CONTRIBUTING](CONTRIBUTING.md#iconos-y-navegación)).

### Autenticación

- **Sesión** (`src/lib/auth`): el login devuelve access token (15 min) y refresh token (2 h), guardados en `localStorage` (`tpif.session`) con el usuario y su rol. Se lee con `useAuth()`.
- **Interceptores**: agregan `Authorization: Bearer`. Ante un 401 hacen un único refresh compartido y reintentan una vez; si falla, se borra la sesión. Las rutas públicas (login, recuperación) no llevan token ni disparan refresh.
- **Rutas protegidas**: `<RequireAuth />` y `<RequireRole roles={[...]} />` (solo UI: el backend igual responde 403).
- **Logout**: `useLogout()` revoca el refresh token y siempre borra sesión y caché; si el servidor no confirmó, el login avisa una vez.
- **Contraseña** (`validatePassword`): de 8 caracteres a 72 bytes UTF-8 (límite de BCrypt).

### Rutas

Paths en `src/router/paths.ts` (con helpers como `athleteProfilePath(id)`); `handle.title` es el texto de la barra de ubicación.

| Ruta                      | Página                         | Acceso       |
| ------------------------- | ------------------------------ | ------------ |
| `/`                       | Inicio                         | público      |
| `/register-coach`         | Registro de entrenador         | público      |
| `/login`                  | Inicio de sesión               | público      |
| `/forgot-password`        | Recuperar contraseña (US-44)   | público      |
| `/reset-password`         | Contraseña nueva (US-44)       | público      |
| `/dashboard`              | Panel (según el rol)           | con sesión   |
| `/athletes`               | Mis atletas                    | solo COACH   |
| `/athletes/new`           | Agregar atleta                 | solo COACH   |
| `/athletes/:id`           | Perfil del atleta (ficha)      | solo COACH   |
| `/athletes/:id/edit`      | Editar atleta                  | solo COACH   |
| `/exercises`              | Catálogo de ejercicios         | solo COACH   |
| `/exercises/new`          | Nuevo ejercicio                | solo COACH   |
| `/exercises/:id/edit`     | Editar ejercicio               | solo COACH   |
| `/routines`               | Mis rutinas                    | solo COACH   |
| `/routines/new`           | Nueva rutina                   | solo COACH   |
| `/routines/:id`           | Detalle de la rutina           | solo COACH   |
| `/routines/:id/edit`      | Editar rutina                  | solo COACH   |
| `/routines/:id/structure` | Estructura de la rutina        | solo COACH   |
| `/foods`                  | Catálogo de alimentos          | con sesión   |
| `/foods/new`              | Nuevo alimento                 | solo COACH   |
| `/foods/:id/edit`         | Editar alimento                | solo COACH   |
| `/my-routine`             | Mi rutina                      | solo ATHLETE |
| `/progress`               | Progreso (peso y fotos)        | solo ATHLETE |
| `/training/:sessionId`    | Entrenamiento en curso         | solo ATHLETE |
| `/meals`                  | Comidas del día (US-23, US-24) | solo ATHLETE |
| `/training-history`       | Entrenamientos (US-21)         | solo ATHLETE |

### Estructura

```
src/
  lib/          utilidades transversales y datos compartidos
  ui/           componentes de UI comunes e iconos
  components/   formularios y vistas compartidas entre páginas
  router/       declaración de rutas (AppRouter)
  pages/
    <modulo>/   index.ts, <Modulo>Page.tsx, types.ts, actions/, hooks/, components/
```

### Componentes de UI y colores

Cada componente tiene un **base** con estilos estructurales y **variantes** que agregan colores. Props con `ComponentPropsWithoutRef<'elemento'>`, clases con `cn()` (el `className` recibido sobrescribe) y `{...rest}`.

Los colores son tokens semánticos en `src/index.css` (`primary`, `secondary`, `muted`, `danger`...). Nunca colores crudos de Tailwind.

## Funcionalidades

Convenciones comunes: los formularios replican las validaciones y mensajes del backend; los 400 van al campo, el resto al aviso general; los errores de red o 5xx muestran «Reintentar» (los 403/404 no). Cada funcionalidad tiene tests unitarios junto al código y un E2E en `e2e/`.

### Entrenador

- **Ficha del atleta** (`/athletes/:id`): datos, último peso, rutina activa e historial de asignaciones, entrenamientos (US-21), alimentación (US-25), notas (US-46) y progreso en solo lectura (US-30). Cada sección carga y falla por separado; un 403/404 muestra un aviso con salida al listado.
- **Ejercicios** (`/exercises`): globales (solo lectura) y propios (editables, baja lógica), con búsqueda y filtro por grupo muscular en la URL.
- **Rutinas** (`/routines`): alta, edición, duplicado (`POST /routines/{id}/duplicate`) y estructura (`/structure`: hasta 7 días y 30 ejercicios por día, guardado en un solo `PUT /routines/{id}/days`). Si se quita algo con series registradas (422), se ofrece duplicar.
- **Asignación** (US-16, `src/components/assign-routine-form`): desde la ficha o el detalle de la rutina. Una rutina activa por atleta; si ya hay otra (409) se pide confirmar y se reenvía con `replaceActive: true`.
- **Panel** (US-11, `src/lib/coach-dashboard/`, `CoachDashboard.tsx`): `GET /coaches/me/dashboard` con cuatro métricas (activos, sin rutina vigente, sesiones por revisar, sin peso reciente), cada una con sus atletas linkeados. Una métrica en `null` (con `warnings`) muestra su aviso sin tapar las demás.
- **Alertas** (US-47, `src/lib/alerts/`, `CoachAlertsCard.tsx`): tarjeta «Requiere atención» arriba del panel (`GET /alerts`). «Atender» (`PATCH /alerts/{id}/handle`) la oculta por 7 días; un 409 se toma como resuelto.
- **Revisión de entrenamientos** (US-21): en la ficha, `PUT .../sessions/{sessionId}/review` con observación opcional (hasta 1000). Solo sesiones finalizadas.
- **Alimentación** (US-25, `NutritionSection`): vista semana (constancia «3 de 7 días con comidas», `GET .../meals/overview`) y vista día con revisión de cada comida (`PUT .../meals/{mealId}/review`).
- **Notas** (US-46, `src/lib/notes/`, `NotesSection.tsx`): privadas o visibles para el atleta (`POST /athletes/{id}/notes`). No se editan ni borran.

### Atleta

- **Panel** (US-12, `src/pages/dashboard/`): tarjetas independientes de entrenamiento de hoy (iniciar o retomar), comidas de hoy, último peso, observaciones del entrenador (las revisadas entre las últimas 20 sesiones) y notas visibles con «Marcar como leída».
- **Mi rutina** (US-17, `/my-routine`): la rutina activa con los días en pestañas, abierta en el que toca (`nextDayId` del backend). Desde ahí se inicia o retoma el entrenamiento (US-18); un 409 al iniciar lleva a retomar.
- **Entrenamiento** (`/training/:sessionId`, `src/pages/training-session/`):
  - Series (US-19): una fila por serie precargada con lo planificado; `PUT .../exercises/{id}/sets/{n}` idempotente, en cola por sesión.
  - Finalizar o cancelar (US-20): con confirmación; finalizar muestra el resumen (series, volumen, duración).
- **Historial** (US-21, `/training-history`, `src/components/training-history/`): sesiones cerradas con filtro de fechas, paginado de a 10, y la observación del entrenador. Misma vista que en la ficha.
- **Progreso** (`/progress`):
  - Peso: un registro por día (un 409 ofrece editar el existente), sin borrado.
  - Evolución (US-29): gráfico SVG propio con rango en la URL (`?from&to`) y tabla accesible.
  - Medidas corporales (US-45, `src/lib/body-measurements/`): un registro por día con las medidas del catálogo (`GET /body-measurement-types`; brazo y pierna por lado, alcanza con uno); un 409 ofrece editar el existente. El selector «Medida» de la evolución elige peso o cada medida y lado (`?metric=`).
  - Fotos (US-28, `src/lib/progress-photos/`): JPG/PNG/WebP hasta 5 MB, visor con navegación y borrado. Las URLs firmadas vencidas se renuevan una sola vez.
- **Comidas** (US-23, US-24, `/meals`): alta con descripción y/o alimentos del catálogo, edición y borrado. Navegación por días en la URL (`?date=`, sin futuro) y resumen de calorías y macros del día (los calcula el backend).
- **Alimentos** (US-39, `/foods`, ambos roles): catálogo global paginado con búsqueda; solo el entrenador crea y edita.

### Cuenta (ambos roles)

- **Mi perfil** (US-48, `/profile`, `src/pages/profile/`, `src/lib/profile/`): datos personales (un 409 marca el email), foto de perfil (JPG, PNG o WebP hasta 5 MB, con vista previa y confirmación; quitarla pide confirmación) y cambio de contraseña con la actual. Se llega desde el bloque de la cuenta del menú, que muestra la foto o las iniciales.

### Recuperación de contraseña (US-44)

`/forgot-password` envía `POST /auth/password-recovery` (siempre 202: la confirmación no revela si el email existe). El link del mail es `/reset-password?token=...` (si cambia la ruta, cambiarla en el backend) y envía `POST /auth/password-reset`. Con 204 se borran sesión y caché y se va al login con aviso; un 400 sin `fieldErrors` (token inválido) ofrece pedir otro enlace.
