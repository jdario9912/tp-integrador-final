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

json-server no valida datos ni devuelve los errores del backend (400, 409): sirve solo para desarrollo. Tampoco autentica: para probar el login hay que usar el backend real (`API_PROXY_TARGET=http://localhost:8080/api`). Además, json-server solo sirve rutas de un nivel (`/recurso` y `/recurso/:id`): los registros de peso (`/athletes/{id}/weights`, paginados), las asignaciones de rutinas (`/athletes/{id}/assignments`), la rutina del atleta (`/athletes/{id}/routine`) y sus sesiones de entrenamiento (`/athletes/{id}/sessions`) no se pueden simular con `mock/db.json`; las páginas Progreso, Mi rutina y Entrenamiento en curso, el último peso, la rutina activa y el historial de la ficha se prueban con el backend real o con los E2E. El catálogo de alimentos (`/foods`) tampoco: json-server no devuelve el `PageResponse` paginado (`content`, `totalPages`...) que espera el listado ni busca por nombre "contiene"; se prueba con el backend real o con `e2e/foods.spec.ts`, que simula el backend en memoria.

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
- **Datos compartidos** (`src/lib/<dominio>`): la acción y el hook que usan varias páginas viven en `lib`, por ejemplo `useAthlete` (`GET /athletes/{id}`) en `src/lib/athletes`, que comparten la ficha y la edición del atleta con la misma clave de caché, o `useMuscleGroups` (`GET /muscle-groups`) en `src/lib/exercises`, que usan el catálogo y el formulario de ejercicios (se pide una sola vez por sesión: `staleTime: Infinity`). Los registros de peso (`src/lib/weights`) cuelgan todos de la clave `['weights', usuario, atleta]`: el alta y la edición la invalidan entera, así se refrescan la lista de Progreso, el último peso de la ficha y cualquier rango de fechas. Las asignaciones de rutinas (`src/lib/assignments`) cuelgan de `['assignments', usuario, atleta]`: asignar la invalida entera (rutina activa e historial) y no toca `['athletes']`, porque el estado del atleta no cambia. El flujo de asignación con confirmación (`useAssignRoutineFlow`) también vive ahí, porque lo usan la ficha y el detalle de la rutina. `src/lib/foods` tiene los tipos del catálogo de alimentos (`Food`, `FoodInput`) (que usan el listado, el formulario y las páginas de alta y edición) y el formato de gramos y calorías de las cards (`formatGrams`, `formatKcal`, con coma decimal). El listado y el detalle cuelgan de `['foods']` sin el usuario, porque el catálogo es global; el alta y la edición la invalidan entera. Las sesiones de entrenamiento (`src/lib/training-sessions`) cuelgan de `['training-sessions', usuario, atleta]` (la sesión en progreso y el detalle de cada una) y no de las asignaciones, porque una sesión en curso sigue viva aunque cambie la rutina. Al iniciar, la respuesta del `POST` siembra la sesión en progreso y el detalle (la pantalla del entrenamiento se muestra sin otra consulta); ante un 409 se vuelve a pedir la sesión en progreso; y al retomar, el detalle arranca con la sesión en progreso que ya estaba en la caché y se vuelve a pedir en segundo plano. La hora de inicio se muestra en la zona de la app con reloj de 24 horas (`formatStartTime`).
- **Decimales** (`src/lib/decimal.ts`): `normalizeDecimal` recorta y pasa la coma decimal a punto antes de validar o convertir un número escrito por el usuario (peso corporal, valores nutricionales).
- **Fechas** (`src/lib/iso-date.ts`): las fechas sin hora (`YYYY-MM-DD`) se formatean en UTC para no correr el día, y "hoy" se calcula en la zona de la app (`America/Argentina/Buenos_Aires`, la misma que `APP_TIME_ZONE` del backend), no en la del navegador.

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
- **Rutas por rol**: las páginas de un solo rol van dentro de `<RequireRole roles={['COACH']} />` o `<RequireRole roles={['ATHLETE']} />`, anidados en `RequireAuth`. Con otro rol redirige a `/dashboard`. Es solo para la UI: si se llama a la API directo, el backend igual responde 403.
- **Datos del usuario**: `useCurrentUser()` (`GET /auth/me`) para mostrar datos frescos; `useAuth().user` tiene los de la sesión.
- **Cierre de sesión**: `useLogout()` llama a `POST /auth/logout` (revoca el refresh token) y, pase lo que pase, borra `tpif.session` y la caché de TanStack Query y vuelve al login. Si el servidor no confirmó el cierre (sin conexión o cualquier error que no sea 401), el login muestra un aviso una sola vez; un 401 se considera un cierre exitoso porque la sesión del servidor ya no existía.
- Después de registrarse, el front inicia sesión con las mismas credenciales y entra al dashboard.

### Rutas

Definidas en `src/router/AppRouter.tsx`; los paths salen de `src/router/paths.ts` (las rutas con parámetros se arman con helpers como `athleteProfilePath(id)`). El `handle.title` de cada ruta es el texto de la barra de ubicación.

| Ruta                      | Página                    | Acceso       |
| ------------------------- | ------------------------- | ------------ |
| `/`                       | Inicio                    | público      |
| `/register-coach`         | Registro de entrenador    | público      |
| `/login`                  | Inicio de sesión          | público      |
| `/dashboard`              | Panel (según el rol)      | con sesión   |
| `/athletes`               | Mis atletas               | solo COACH   |
| `/athletes/new`           | Agregar atleta            | solo COACH   |
| `/athletes/:id`           | Perfil del atleta (ficha) | solo COACH   |
| `/athletes/:id/edit`      | Editar atleta             | solo COACH   |
| `/exercises`              | Catálogo de ejercicios    | solo COACH   |
| `/exercises/new`          | Nuevo ejercicio           | solo COACH   |
| `/exercises/:id/edit`     | Editar ejercicio          | solo COACH   |
| `/routines`               | Mis rutinas               | solo COACH   |
| `/routines/new`           | Nueva rutina              | solo COACH   |
| `/routines/:id`           | Detalle de la rutina      | solo COACH   |
| `/routines/:id/edit`      | Editar rutina             | solo COACH   |
| `/routines/:id/structure` | Estructura de la rutina   | solo COACH   |
| `/foods`                  | Catálogo de alimentos     | con sesión   |
| `/foods/new`              | Nuevo alimento            | solo COACH   |
| `/foods/:id/edit`         | Editar alimento           | solo COACH   |
| `/my-routine`             | Mi rutina                 | solo ATHLETE |
| `/progress`               | Progreso (peso corporal)  | solo ATHLETE |
| `/training/:sessionId`    | Entrenamiento en curso    | solo ATHLETE |

`/athletes/new` y `/athletes/:id` conviven: React Router prioriza el segmento estático. La ficha (`/athletes/:id`) muestra datos personales, salud y entrenamiento, historial de rutinas, último peso, rutina activa y últimas sesiones (esta última, vacía hasta que exista ese módulo). Ante un 403 (atleta desvinculado o de otro entrenador) o un 404 muestra un aviso con la salida al listado. El último peso es el registro más reciente del atleta (`GET /athletes/{id}/weights?size=1`, pedido en paralelo con el atleta) con su fecha y comentario; sin registros, el peso inicial rotulado "Peso inicial". Si falla solo esa llamada, la sección muestra su error con "Reintentar" y el resto de la ficha se ve. La rutina activa y el historial salen de la primera página del historial (`GET /athletes/{id}/assignments?page=0&size=10`, también en paralelo con el atleta), que comparten las dos secciones; si falla, cada una muestra su error con "Reintentar".

Progreso (`/progress`, solo el atleta, entrada "Progreso" en su menú) es donde el atleta registra su peso corporal: fecha (por defecto, hoy en hora de Argentina; no admite fechas futuras), peso (20 a 300 kg, hasta 2 decimales) y comentario opcional (hasta 500 caracteres), con las mismas validaciones y mensajes que el backend. Además ve sus 10 registros más recientes y puede editar cualquiera desde la lista (el mismo formulario pasa a modo edición, con "Cancelar"). Hay un registro por día: si la fecha ya tiene uno (409), la página lo busca (`?from=<fecha>&to=<fecha>`) y ofrece editarlo. Los registros no se borran. El gráfico de evolución y las fotos llegan con US-29.

Mi rutina (`/my-routine`, solo el atleta, entrada "Mi rutina" en su menú, entre Panel y Progreso) muestra la rutina activa que le asignó su entrenador (`GET /athletes/{id}/routine`, US-17): nombre, objetivo y vigencia ("Vigente hasta el …" o "Sin fecha de vencimiento"; si venció, un aviso con la fecha y la rutina se sigue viendo). Los días van en pestañas (`src/ui/tabs`: se recorren con las flechas, Inicio y Fin) y arranca abierto el día que le toca, marcado "Hoy" (lo calcula el backend: `nextDayId`). Cada ejercicio muestra su grupo muscular (de `GET /muscle-groups`; si no llega, se omite), series × repeticiones y, si se cargaron, peso, descanso, esfuerzo (RIR/RPE) y nota técnica. Sin rutina (204) muestra «Tu entrenador aún no te asignó una rutina»; un día sin ejercicios o una rutina sin días, su estado vacío; 403 y 404 un aviso sin "Reintentar"; un error de red o del servidor, el mensaje con "Reintentar". En móvil las pestañas muestran solo "Día N" y los datos de la rutina van debajo del entrenamiento; desde `lg`, a la derecha.

Desde Mi rutina el atleta inicia y retoma sus entrenamientos (US-18). La página pide la sesión en progreso (`GET /athletes/{id}/sessions/in-progress`, 204 = ninguna) junto con la rutina y muestra el contenido cuando tiene las dos respuestas. Sin entrenamiento en curso, el panel del día elegido ofrece «Iniciar entrenamiento» (`POST /athletes/{id}/sessions` con `{ routineDayId }`; mientras tanto, «Iniciando…» y deshabilitado) y, al iniciar, lleva a la pantalla del entrenamiento. No se ofrece con la rutina vencida (lo explica su aviso) ni en un día sin ejercicios. Con uno en curso, un aviso arriba («Tenés un entrenamiento en curso: Día 1: Torso, desde las 19:15», con la fecha si quedó abierto de otro día) ofrece «Retomar» y no se puede iniciar otro, aunque la rutina esté vencida. Si al iniciar el backend responde 409 (otra pestaña u otro dispositivo ya inició uno), se vuelve a pedir la sesión en progreso y el aviso aparece con el foco y «Retomar» (si ya no hay ninguna, se puede iniciar de nuevo). Un 422 (sin rutina activa, vencida, día ajeno o sin ejercicios) muestra el mensaje del backend; un error de red o del servidor, el mensaje y el botón pasa a «Reintentar», con el mismo día elegido. Si no se puede saber si hay uno en curso, igual se ofrece iniciar: el 409 lleva a retomarlo.

La pantalla del entrenamiento (`/training/:sessionId`, solo el atleta, sin entrada en el menú: se llega desde Mi rutina) muestra la rutina, la hora de inicio en hora de Argentina («Empezaste hoy a las 19:15») y el día con sus ejercicios planificados, de solo lectura, con el mismo panel de Mi rutina (`DayWorkout`). El título depende del estado («Entrenamiento en curso»; desde US-20, finalizado o cancelado). Un 404 (no existe o es de otro atleta) o un 400 muestran «No encontramos este entrenamiento», un 403 un aviso de permisos (sin "Reintentar") y un error de red o del servidor, el mensaje con "Reintentar". Es donde US-19 va a sumar la carga de series y US-20 los botones de finalizar y cancelar.

El catálogo de ejercicios (`/exercises`) lista los ejercicios globales del sistema y los propios del entrenador, con búsqueda por nombre y filtro por grupo muscular (agrupado por región) guardados en la URL. Los globales son de solo lectura: su `/exercises/:id/edit` muestra los datos sin formulario. Los propios se editan y se dan de baja (baja lógica: las rutinas que ya los usan no cambian). El formulario es compartido entre alta y edición (`src/components/exercise-form`).

El catálogo de alimentos (`/foods`, US-39, entrada "Alimentos" en el menú de los dos roles) es global: no tiene autor y lo consultan entrenadores y atletas. Lista los alimentos ordenados por nombre y paginados de a 20, con búsqueda por nombre ("contiene", sin distinguir mayúsculas); la búsqueda y la página van en la URL. Cada card muestra la porción de referencia y las calorías, proteínas, carbohidratos y grasas de esa porción. Solo el entrenador ve "Nuevo alimento" y "Editar": cualquier entrenador puede editar cualquier alimento, y no hay baja. El formulario (`src/components/food-form`) es compartido entre alta y edición, con las mismas validaciones y mensajes que el backend: nombre obligatorio de hasta 100 caracteres y único sin distinguir mayúsculas (el 409 se muestra en el campo), porción mayor a 0 y macros mayores o iguales a 0, todos hasta 10000 y con hasta 2 decimales. Los errores por campo del 400 van a su campo y el 403 y el resto, al aviso general. Si el alimento no existe (404), la edición muestra un aviso con la salida al listado.

Las rutinas (`/routines`) muestran solo las del entrenador, ordenadas por nombre y paginadas (la página va en la URL). El alta (`/routines/new`, formulario en `src/components/routine-form`) carga los datos generales: nombre (obligatorio y único entre las rutinas propias, sin distinguir mayúsculas; el 409 se muestra en el campo), objetivo, días por semana (1 a 7), duración en semanas (1 a 52), descripción y si es plantilla. Después del alta se va al detalle (`/routines/:id`), de solo lectura, que muestra los datos generales y los días con sus ejercicios; ante un 403 (rutina de otro entrenador) o un 404 muestra un aviso con la salida al listado (lo mismo en la edición y la estructura).

Desde el detalle se edita (`/routines/:id/edit`, con el mismo formulario del alta), se duplica (`POST /routines/{id}/duplicate`: la copia se llama «Copia de X» y se navega a su detalle) y se configura la estructura (`/routines/:id/structure`, formulario en `src/components/routine-structure-form`). En la estructura se agregan, renombran, reordenan y quitan días (hasta 7) y se cargan ejercicios del catálogo con un buscador (hasta 30 por día), con series, repeticiones, peso recomendado (kg), descanso (segundos), RIR/RPE (`RIR n` o `RPE n`) y nota técnica. Todo se edita en el navegador y se guarda en una sola llamada (`PUT /routines/{id}/days`): el orden de los arrays define el número de día y el orden de los ejercicios, los ítems guardados se envían con su `id` y los nuevos sin `id`. Los ejercicios se reordenan dentro de su día (el backend no acepta el `id` de un ejercicio en otro día). Los errores por campo del backend (`days[0].exercises[1].sets`) se muestran en el campo correspondiente; si se quita un día o ejercicio que ya tiene series registradas (422) se ofrece duplicar la rutina y editar la copia. Desde el detalle también se asigna la rutina a un atleta ("Asignar a atleta").

La asignación de rutinas (US-16) se hace desde la ficha del atleta ("Asignar rutina" o "Cambiar rutina", en la sección Rutina activa) o desde el detalle de la rutina ("Asignar a atleta"), con un formulario en línea compartido (`src/components/assign-routine-form`) de un solo selector. Un atleta tiene una sola rutina activa; las anteriores quedan en su historial como inactivas, ordenado con la activa primero y después de la más reciente a la más antigua (paginado de a 10). El front siempre envía primero `POST /athletes/{id}/assignments` sin `replaceActive`: si el atleta ya tiene otra activa, el backend responde 409 nombrándola, se pide confirmar el reemplazo y se reenvía con `replaceActive: true`. Asignar no cambia el estado de seguimiento del atleta. En el selector, la rutina activa y los atletas con la cuenta desactivada se ven pero no se pueden elegir, y con la cuenta desactivada el botón de la ficha queda deshabilitado. Los demás errores muestran el mensaje del backend: 422 (atleta desactivado o desvinculado, rutina sin días o con días sin ejercicios, o la misma rutina ya activa; si la rutina está incompleta se ofrece "Configurar estructura") y 403 o 404. Las plantillas también se pueden asignar.

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
