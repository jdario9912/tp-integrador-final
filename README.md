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

json-server no valida datos ni devuelve los errores del backend (400, 409): sirve solo para desarrollo.

### Tests E2E

Antes de correr los E2E por primera vez: `pnpm exec playwright install chromium`. Los E2E levantan su propio servidor en `:5174` e interceptan la API, así que no necesitan backend.

### Variables de entorno

Las variables de entorno van en `.env` (ignorado por git); `.env.example` es la plantilla versionada.

- `VITE_API_URL`: URL base que usa el cliente. Por defecto `/api`.
- `API_PROXY_TARGET`: a dónde reenvía `/api` el servidor de desarrollo (se quita el prefijo `/api`). No se expone al cliente.
  - json-server (por defecto): `http://localhost:3001`
  - backend real: URL del backend incluyendo el prefijo `/api`

Se usa proxy porque el backend responde 401 al preflight `OPTIONS` sin cabeceras CORS; así el navegador ve un único origen. Vite lee estas variables solo al arrancar: reiniciá `pnpm dev` después de cambiarlas.

## Arquitectura

### Flujo de datos

```
componente React -> hook (TanStack Query) -> acción -> cliente REST (axios)
```

- **Cliente REST** (`src/lib/api`): funciones tipadas `get`, `post`, `put`, `patch`, `del` que devuelven directamente el body. Todo error se normaliza a `ApiError` (`status`, `message`, `path`, `timestamp`); `status: 0` indica que no hubo respuesta del servidor.
- **Acciones** (`src/pages/<modulo>/actions`): reciben los inputs de la operación y llaman al cliente REST.
- **Hooks** (`src/pages/<modulo>/hooks`): envuelven las acciones con `useQuery` / `useMutation` y son lo único que consumen los componentes.

```ts
// actions/create-coach.ts
export const createCoach = (input: CreateCoachInput) =>
  post<Coach, CreateCoachInput>('/coaches', input)

// hooks/use-create-coach.ts
export const useCreateCoach = () => useMutation({ mutationFn: createCoach })
```

Formularios: TanStack Form. Rutas: React Router, definidas en `src/router/AppRouter.tsx`. `src/App.tsx` solo compone los providers globales.

### Estructura

```
src/
  lib/          utilidades transversales (cn, cliente REST, query client)
  ui/           componentes de UI comunes (botones, inputs, ...)
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
