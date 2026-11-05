# tpif-frontend

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

Para usar json-server hay que crear primero `mock/db.json` (está ignorado por git, así cada uno tiene sus propios datos). Cada clave es un recurso de la API:

```bash
mkdir -p mock
echo '{ "coaches": [] }' > mock/db.json
pnpm mock:api   # json-server en :3001, en otra terminal que pnpm dev
```

json-server no valida datos ni devuelve los errores del backend (400, 409): sirve solo para desarrollo. Tampoco autentica: para probar el login hay que usar el backend real (`API_PROXY_TARGET=http://localhost:8080/api`).

### Tests E2E

Antes de correr los E2E por primera vez: `pnpm exec playwright install chromium`. Los E2E levantan su propio servidor en `:5174` e interceptan la API, así que no necesitan backend.

### Variables de entorno

Las variables de entorno van en `.env` (ignorado por git); `.env.example` es la plantilla versionada.

- `VITE_API_URL`: URL base que usa el cliente. Por defecto `/api`.
- `API_PROXY_TARGET`: a dónde reenvía `/api` el servidor de desarrollo (se quita el prefijo `/api`). No se expone al cliente.
  - json-server (por defecto): `http://localhost:3001`
  - backend real: URL del backend incluyendo el prefijo `/api`

Con el proxy el navegador ve un único origen y no hace falta CORS en desarrollo. En producción no hay proxy de Vite: `VITE_API_URL` tiene que ser la URL absoluta del backend (que responde con CORS). Vite lee estas variables solo al arrancar: reiniciá `pnpm dev` después de cambiarlas.

## Arquitectura

### Flujo de datos

```
componente React -> hook (TanStack Query) -> acción -> cliente REST (axios)
```

- **Cliente REST** (`src/lib/api`): funciones tipadas `get`, `post`, `put`, `patch`, `del` que devuelven directamente el body. Todo error se normaliza a `ApiError` (`status`, `message`, `path`, `timestamp`); `status: 0` indica que no hubo respuesta del servidor.
- **Acciones** (`src/pages/<modulo>/actions`): reciben los inputs de la operación y llaman al cliente REST.
- **Hooks** (`src/pages/<modulo>/hooks`): envuelven las acciones con `useQuery` / `useMutation` y son lo único que consumen los componentes.
- **Datos compartidos** (`src/lib/<dominio>`): la acción y el hook que usan varias páginas viven en `lib`, por ejemplo `useAthlete` (`GET /athletes/{id}`) en `src/lib/athletes`, que comparten la ficha y la edición del atleta con la misma clave de caché, o `useMuscleGroups` (`GET /muscle-groups`) en `src/lib/exercises`, que usan el catálogo y el formulario de ejercicios (se pide una sola vez por sesión: `staleTime: Infinity`).

```ts
// actions/create-coach.ts
export const createCoach = (input: CreateCoachInput) =>
  post<Coach, CreateCoachInput>('/coaches', input)

// hooks/use-create-coach.ts
export const useCreateCoach = () => useMutation({ mutationFn: createCoach })
```

Formularios: TanStack Form. Rutas: React Router, definidas en `src/router/AppRouter.tsx`. `src/App.tsx` solo compone los providers globales.

Iconos y navegación se importan desde `src/ui/icons` y `src/lib/navigation`, nunca directo de `lucide-react` o `react-router-dom` (lo controla oxlint; ver [CONTRIBUTING](CONTRIBUTING.md#iconos-y-navegación)).

### Autenticación

- **Sesión** (`src/lib/auth`): el login (`POST /auth/login`) devuelve un access token (15 min) y un refresh token (2 h). Se guardan en `localStorage` (`tpif.session`) junto con el usuario y su rol. Los componentes la leen con `useAuth()`; no hace falta ningún Provider.
- **Interceptores**: el cliente REST agrega `Authorization: Bearer <accessToken>` a cada request. Ante un 401 hace un único refresh (`POST /auth/refresh`, compartido entre requests simultáneos porque el backend rota el refresh token) y reintenta una vez. Si el refresh falla, borra la sesión y `RequireAuth` lleva al login.
- **Rutas protegidas**: van dentro de `<RequireAuth />` en `AppRouter`. `/dashboard` es una sola ruta para los dos roles y muestra el panel según `user.role`.
- **Rutas por rol**: las páginas de un solo rol van dentro de `<RequireRole roles={['COACH']} />`, anidado en `RequireAuth`. Con otro rol redirige a `/dashboard`. Es solo para la UI: si se llama a la API directo, el backend igual responde 403.
- **Datos del usuario**: `useCurrentUser()` (`GET /auth/me`) para mostrar datos frescos; `useAuth().user` tiene los de la sesión.
- **Cierre de sesión**: `useLogout()` llama a `POST /auth/logout` (revoca el refresh token) y, pase lo que pase, borra `tpif.session` y la caché de TanStack Query y vuelve al login. Si el servidor no confirmó el cierre (sin conexión o cualquier error que no sea 401), el login muestra un aviso una sola vez; un 401 se considera un cierre exitoso porque la sesión del servidor ya no existía.
- Después de registrarse, el front inicia sesión con las mismas credenciales y entra al dashboard.

### Rutas

Definidas en `src/router/AppRouter.tsx`; los paths salen de `src/router/paths.ts` (las rutas con parámetros se arman con helpers como `athleteProfilePath(id)`). El `handle.title` de cada ruta es el texto de la barra de ubicación.

| Ruta                  | Página                    | Acceso     |
| --------------------- | ------------------------- | ---------- |
| `/`                   | Inicio                    | público    |
| `/register-coach`     | Registro de entrenador    | público    |
| `/login`              | Inicio de sesión          | público    |
| `/dashboard`          | Panel (según el rol)      | con sesión |
| `/athletes`           | Mis atletas               | solo COACH |
| `/athletes/new`       | Agregar atleta            | solo COACH |
| `/athletes/:id`       | Perfil del atleta (ficha) | solo COACH |
| `/athletes/:id/edit`  | Editar atleta             | solo COACH |
| `/exercises`          | Catálogo de ejercicios    | solo COACH |
| `/exercises/new`      | Nuevo ejercicio           | solo COACH |
| `/exercises/:id/edit` | Editar ejercicio          | solo COACH |

`/athletes/new` y `/athletes/:id` conviven: React Router prioriza el segmento estático. La ficha (`/athletes/:id`) muestra datos personales, salud y entrenamiento, último peso (el peso inicial hasta que existan los registros de peso), rutina activa y últimas sesiones (estas dos, vacías hasta que existan esos módulos). Ante un 403 (atleta desvinculado o de otro entrenador) o un 404 muestra un aviso con la salida al listado.

El catálogo de ejercicios (`/exercises`) lista los ejercicios globales del sistema y los propios del entrenador, con búsqueda por nombre y filtro por grupo muscular (agrupado por región) guardados en la URL. Los globales son de solo lectura: su `/exercises/:id/edit` muestra los datos sin formulario. Los propios se editan y se dan de baja (baja lógica: las rutinas que ya los usan no cambian). El formulario es compartido entre alta y edición (`src/components/exercise-form`).

### Estructura

```
src/
  lib/          utilidades transversales (cn, cliente REST, query client, sesión, validaciones, navegación)
  ui/           componentes de UI comunes (botones, inputs, ...) e iconos
  router/       declaración de rutas (AppRouter)
  pages/
    <modulo>/   index.ts, <Modulo>Page.tsx, types.ts, actions/, hooks/, components/
```

### Componentes de UI

Cada componente tiene un **base** con estilos estructurales (rounded, padding, tamaño de fuente) sin colores, y **variantes** que lo reutilizan agregando colores:

- Props tipadas con `ComponentPropsWithoutRef<'elemento'>`.
- Clases combinadas con `cn()` (clsx + tailwind-merge), por lo que el `className` recibido sobrescribe las clases base.
- Se renderiza `children` cuando aplica y se esparcen las demás props (`{...rest}`).

```tsx
<PrimaryButton type="submit" disabled={isPending}>
  Registrar
</PrimaryButton>
```

### Colores

Los colores se definen como tokens semánticos en `src/index.css` (`@theme`): `primary`, `secondary`, `background`, `foreground`, `muted`, `border`, `ring`, `danger` y sus `-foreground` / `-hover`. Los componentes usan solo estos tokens (`bg-primary`, `text-muted-foreground`), nunca colores crudos de Tailwind.
