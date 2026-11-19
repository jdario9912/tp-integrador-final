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

json-server no valida datos ni devuelve los errores del backend (400, 409): sirve solo para desarrollo. Tampoco autentica: para probar el login hay que usar el backend real (`API_PROXY_TARGET=http://localhost:8080/api`). Además, json-server solo sirve rutas de un nivel (`/recurso` y `/recurso/:id`): los registros de peso (`/athletes/{id}/weights`, paginados), las asignaciones de rutinas (`/athletes/{id}/assignments`), la rutina del atleta (`/athletes/{id}/routine`) y sus sesiones de entrenamiento (`/athletes/{id}/sessions`) no se pueden simular con `mock/db.json`; las páginas Progreso, Mi rutina y Entrenamiento en curso, el último peso, la rutina activa y el historial de la ficha se prueban con el backend real o con los E2E. El catálogo de alimentos (`/foods`) tampoco: json-server no devuelve el `PageResponse` paginado (`content`, `totalPages`...) que espera el listado ni busca por nombre "contiene"; se prueba con el backend real o con `e2e/foods.spec.ts`, que simula el backend en memoria. Tampoco se simulan las notas (`/athletes/{id}/notes`, US-46), atender una alerta (`PATCH /alerts/{id}/handle`, US-47) ni la recuperación de contraseña (US-44): se prueban con el backend real o con sus E2E.

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
- **Datos compartidos** (`src/lib/<dominio>`): la acción y el hook que usan varias páginas viven en `lib`, por ejemplo `useAthlete` (`GET /athletes/{id}`) en `src/lib/athletes`, que comparten la ficha y la edición del atleta con la misma clave de caché, o `useMuscleGroups` (`GET /muscle-groups`) en `src/lib/exercises`, que usan el catálogo y el formulario de ejercicios (se pide una sola vez por sesión: `staleTime: Infinity`). Los registros de peso (`src/lib/weights`) cuelgan todos de la clave `['weights', usuario, atleta]`: el alta y la edición la invalidan entera, así se refrescan la lista de Progreso, el último peso de la ficha y cualquier rango de fechas. Las asignaciones de rutinas (`src/lib/assignments`) cuelgan de `['assignments', usuario, atleta]`: asignar la invalida entera (rutina activa e historial) y no toca `['athletes']`, porque el estado del atleta no cambia. El flujo de asignación con confirmación (`useAssignRoutineFlow`) también vive ahí, porque lo usan la ficha y el detalle de la rutina. `src/lib/foods` tiene los tipos del catálogo de alimentos (`Food`, `FoodInput`) (que usan el listado, el formulario y las páginas de alta y edición) y el formato de gramos y calorías de las cards (`formatGrams`, `formatKcal`, con coma decimal). El listado y el detalle cuelgan de `['foods']` sin el usuario, porque el catálogo es global; el alta y la edición la invalidan entera. Las sesiones de entrenamiento (`src/lib/training-sessions`) cuelgan de `['training-sessions', usuario, atleta]` (la sesión en progreso y el detalle de cada una) y no de las asignaciones, porque una sesión en curso sigue viva aunque cambie la rutina. Al iniciar, la respuesta del `POST` siembra la sesión en progreso y el detalle (la pantalla del entrenamiento se muestra sin otra consulta); ante un 409 se vuelve a pedir la sesión en progreso; y al retomar, el detalle arranca con la sesión en progreso que ya estaba en la caché y se vuelve a pedir en segundo plano. La hora de inicio se muestra en la zona de la app con reloj de 24 horas (`formatStartTime`). Las notas del entrenador (`src/lib/notes`, US-46) cuelgan de `['notes', usuario, atleta]`: el alta y "marcar como leída" la invalidan (el entrenador y el atleta ven listas distintas del mismo atleta, por eso va el usuario). Las alertas (`src/lib/alerts`, US-47) cuelgan de `['alerts', usuario]` y atender una la invalida.
- **Decimales** (`src/lib/decimal.ts`): `normalizeDecimal` recorta y pasa la coma decimal a punto antes de validar o convertir un número escrito por el usuario (peso corporal, valores nutricionales).
- **Fechas** (`src/lib/iso-date.ts`): las fechas sin hora (`YYYY-MM-DD`) se formatean en UTC para no correr el día; los instantes ISO (`createdAt`, `generatedAt`...) se muestran con el día de la zona de la app (`formatInstantDate`), y "hoy" se calcula en la zona de la app (`America/Argentina/Buenos_Aires`, la misma que `APP_TIME_ZONE` del backend), no en la del navegador.

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
- **Recuperación de contraseña** (US-44): `POST /auth/password-recovery` y `POST /auth/password-reset` son públicos. El interceptor los trata como el login: no les manda el access token y su 401 no dispara un refresh (el link del mail se puede abrir con una sesión vieja guardada). Ver «Recuperación de contraseña (US-44)».
- **Política de contraseña** (`validatePassword` en `src/lib/validation.ts`, la usan el registro y la recuperación): de 8 caracteres a 72 bytes UTF-8, el límite de BCrypt en el backend (una letra con tilde ocupa 2 bytes).

### Rutas

Definidas en `src/router/AppRouter.tsx`; los paths salen de `src/router/paths.ts` (las rutas con parámetros se arman con helpers como `athleteProfilePath(id)`). El `handle.title` de cada ruta es el texto de la barra de ubicación.

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

`/athletes/new` y `/athletes/:id` conviven: React Router prioriza el segmento estático. La ficha (`/athletes/:id`) muestra datos personales, salud y entrenamiento, historial de rutinas, último peso, rutina activa el historial de entrenamientos (US-21: sesiones cerradas, detalle de series y revisión del entrenador, ver más abajo) la alimentación (US-25: semana o día y revisión de comidas, ver más abajo) y, debajo, el progreso del atleta en solo lectura (US-30: evolución del peso y fotos, ver más abajo). Ante un 403 (atleta desvinculado o de otro entrenador) o un 404 muestra un aviso con la salida al listado. El último peso es el registro más reciente del atleta (`GET /athletes/{id}/weights?size=1`, pedido en paralelo con el atleta) con su fecha y comentario; sin registros, el peso inicial rotulado "Peso inicial". Si falla solo esa llamada, la sección muestra su error con "Reintentar" y el resto de la ficha se ve. La rutina activa y el historial salen de la primera página del historial (`GET /athletes/{id}/assignments?page=0&size=10`, también en paralelo con el atleta), que comparten las dos secciones; si falla, cada una muestra su error con "Reintentar".

Progreso (`/progress`, solo el atleta, entrada "Progreso" en su menú) es donde el atleta registra su peso corporal: fecha (por defecto, hoy en hora de Argentina; no admite fechas futuras), peso (20 a 300 kg, hasta 2 decimales) y comentario opcional (hasta 500 caracteres), con las mismas validaciones y mensajes que el backend. Además ve sus 10 registros más recientes y puede editar cualquiera desde la lista (el mismo formulario pasa a modo edición, con "Cancelar"). Hay un registro por día: si la fecha ya tiene uno (409), la página lo busca (`?from=<fecha>&to=<fecha>`) y ofrece editarlo. Los registros no se borran. Las fotos de progreso están en la misma página (ver «Fotos de progreso» más abajo); el gráfico de evolución llega con US-29.

Mi rutina (`/my-routine`, solo el atleta, entrada "Mi rutina" en su menú, entre Panel y Progreso) muestra la rutina activa que le asignó su entrenador (`GET /athletes/{id}/routine`, US-17): nombre, objetivo y vigencia ("Vigente hasta el …" o "Sin fecha de vencimiento"; si venció, un aviso con la fecha y la rutina se sigue viendo). Los días van en pestañas (`src/ui/tabs`: se recorren con las flechas, Inicio y Fin) y arranca abierto el día que le toca, marcado "Hoy" (lo calcula el backend: `nextDayId`). Cada ejercicio muestra su grupo muscular (de `GET /muscle-groups`; si no llega, se omite), series × repeticiones y, si se cargaron, peso, descanso, esfuerzo (RIR/RPE) y nota técnica. Sin rutina (204) muestra «Tu entrenador aún no te asignó una rutina»; un día sin ejercicios o una rutina sin días, su estado vacío; 403 y 404 un aviso sin "Reintentar"; un error de red o del servidor, el mensaje con "Reintentar". En móvil las pestañas muestran solo "Día N" y los datos de la rutina van debajo del entrenamiento; desde `lg`, a la derecha.

Desde Mi rutina el atleta inicia y retoma sus entrenamientos (US-18). La página pide la sesión en progreso (`GET /athletes/{id}/sessions/in-progress`, 204 = ninguna) junto con la rutina y muestra el contenido cuando tiene las dos respuestas. Sin entrenamiento en curso, el panel del día elegido ofrece «Iniciar entrenamiento» (`POST /athletes/{id}/sessions` con `{ routineDayId }`; mientras tanto, «Iniciando…» y deshabilitado) y, al iniciar, lleva a la pantalla del entrenamiento. No se ofrece con la rutina vencida (lo explica su aviso) ni en un día sin ejercicios. Con uno en curso, un aviso arriba («Tenés un entrenamiento en curso: Día 1: Torso, desde las 19:15», con la fecha si quedó abierto de otro día) ofrece «Retomar» y no se puede iniciar otro, aunque la rutina esté vencida. Si al iniciar el backend responde 409 (otra pestaña u otro dispositivo ya inició uno), se vuelve a pedir la sesión en progreso y el aviso aparece con el foco y «Retomar» (si ya no hay ninguna, se puede iniciar de nuevo). Un 422 (sin rutina activa, vencida, día ajeno o sin ejercicios) muestra el mensaje del backend; un error de red o del servidor, el mensaje y el botón pasa a «Reintentar», con el mismo día elegido. Si no se puede saber si hay uno en curso, igual se ofrece iniciar: el 409 lleva a retomarlo.

La pantalla del entrenamiento (`/training/:sessionId`, solo el atleta, sin entrada en el menú: se llega desde Mi rutina) muestra la rutina, la hora de inicio en hora de Argentina («Empezaste hoy a las 19:15») y el día con sus ejercicios planificados, de solo lectura, con el mismo panel de Mi rutina (`DayWorkout`). El título depende del estado («Entrenamiento en curso»; desde US-20, finalizado o cancelado). Un 404 (no existe o es de otro atleta) o un 400 muestran «No encontramos este entrenamiento», un 403 un aviso de permisos (sin "Reintentar") y un error de red o del servidor, el mensaje con "Reintentar". Es donde US-19 va a sumar la carga de series y US-20 los botones de finalizar y cancelar.

El catálogo de ejercicios (`/exercises`) lista los ejercicios globales del sistema y los propios del entrenador, con búsqueda por nombre y filtro por grupo muscular (agrupado por región) guardados en la URL. Los globales son de solo lectura: su `/exercises/:id/edit` muestra los datos sin formulario. Los propios se editan y se dan de baja (baja lógica: las rutinas que ya los usan no cambian). El formulario es compartido entre alta y edición (`src/components/exercise-form`).

El catálogo de alimentos (`/foods`, US-39, entrada "Alimentos" en el menú de los dos roles) es global: no tiene autor y lo consultan entrenadores y atletas. Lista los alimentos ordenados por nombre y paginados de a 20, con búsqueda por nombre ("contiene", sin distinguir mayúsculas); la búsqueda y la página van en la URL. Cada card muestra la porción de referencia y las calorías, proteínas, carbohidratos y grasas de esa porción. Solo el entrenador ve "Nuevo alimento" y "Editar": cualquier entrenador puede editar cualquier alimento, y no hay baja. El formulario (`src/components/food-form`) es compartido entre alta y edición, con las mismas validaciones y mensajes que el backend: nombre obligatorio de hasta 100 caracteres y único sin distinguir mayúsculas (el 409 se muestra en el campo), porción mayor a 0 y macros mayores o iguales a 0, todos hasta 10000 y con hasta 2 decimales. Los errores por campo del 400 van a su campo y el 403 y el resto, al aviso general. Si el alimento no existe (404), la edición muestra un aviso con la salida al listado.

Las rutinas (`/routines`) muestran solo las del entrenador, ordenadas por nombre y paginadas (la página va en la URL). El alta (`/routines/new`, formulario en `src/components/routine-form`) carga los datos generales: nombre (obligatorio y único entre las rutinas propias, sin distinguir mayúsculas; el 409 se muestra en el campo), objetivo, días por semana (1 a 7), duración en semanas (1 a 52), descripción y si es plantilla. Después del alta se va al detalle (`/routines/:id`), de solo lectura, que muestra los datos generales y los días con sus ejercicios; ante un 403 (rutina de otro entrenador) o un 404 muestra un aviso con la salida al listado (lo mismo en la edición y la estructura).

Desde el detalle se edita (`/routines/:id/edit`, con el mismo formulario del alta), se duplica (`POST /routines/{id}/duplicate`: la copia se llama «Copia de X» y se navega a su detalle) y se configura la estructura (`/routines/:id/structure`, formulario en `src/components/routine-structure-form`). En la estructura se agregan, renombran, reordenan y quitan días (hasta 7) y se cargan ejercicios del catálogo con un buscador (hasta 30 por día), con series, repeticiones, peso recomendado (kg), descanso (segundos), RIR/RPE (`RIR n` o `RPE n`) y nota técnica. Todo se edita en el navegador y se guarda en una sola llamada (`PUT /routines/{id}/days`): el orden de los arrays define el número de día y el orden de los ejercicios, los ítems guardados se envían con su `id` y los nuevos sin `id`. Los ejercicios se reordenan dentro de su día (el backend no acepta el `id` de un ejercicio en otro día). Los errores por campo del backend (`days[0].exercises[1].sets`) se muestran en el campo correspondiente; si se quita un día o ejercicio que ya tiene series registradas (422) se ofrece duplicar la rutina y editar la copia. Desde el detalle también se asigna la rutina a un atleta ("Asignar a atleta").

La asignación de rutinas (US-16) se hace desde la ficha del atleta ("Asignar rutina" o "Cambiar rutina", en la sección Rutina activa) o desde el detalle de la rutina ("Asignar a atleta"), con un formulario en línea compartido (`src/components/assign-routine-form`) de un solo selector. Un atleta tiene una sola rutina activa; las anteriores quedan en su historial como inactivas, ordenado con la activa primero y después de la más reciente a la más antigua (paginado de a 10). El front siempre envía primero `POST /athletes/{id}/assignments` sin `replaceActive`: si el atleta ya tiene otra activa, el backend responde 409 nombrándola, se pide confirmar el reemplazo y se reenvía con `replaceActive: true`. Asignar no cambia el estado de seguimiento del atleta. En el selector, la rutina activa y los atletas con la cuenta desactivada se ven pero no se pueden elegir, y con la cuenta desactivada el botón de la ficha queda deshabilitado. Los demás errores muestran el mensaje del backend: 422 (atleta desactivado o desvinculado, rutina sin días o con días sin ejercicios, o la misma rutina ya activa; si la rutina está incompleta se ofrece "Configurar estructura") y 403 o 404. Las plantillas también se pueden asignar.

### Fotos de progreso (US-28)

En `/progress`, debajo de los pesos, el atleta sube sus fotos de progreso (frontal, lateral o espalda) y las ve en una línea de tiempo: la grilla va de la más antigua a la más reciente, con su tipo y su fecha. Al tocar una miniatura se abre el visor en grande (`dialog` nativo), con «Anterior» y «Siguiente» para recorrer las fotos ya cargadas y «Borrar foto». Cada foto puede borrarse después de confirmarlo (el atleta borra sus propias fotos).

- **Subida** (`POST /athletes/{id}/photos`, multipart con `file`, `type` y `takenOn`): el formulario elige el tipo, la fecha (por defecto, hoy en la zona de la app) y el archivo. El archivo se valida antes de enviarse: JPG, PNG o WebP, y hasta 5 MB. El servidor es la autoridad: sus errores (413, 415, 400 con campos) se muestran en el formulario. Mientras se sube, el botón queda deshabilitado (un reintento crearía otra foto).
- **Listado** (`GET /athletes/{id}/photos`): paginado de a 20, con «Cargar más fotos» para seguir la línea de tiempo.
- **URLs firmadas**: cada foto trae su `url` y su `urlExpiresAt`. Si la URL ya venció (con un margen de 30 s) o la imagen falla al cargar, la foto se pide de nuevo (`GET /athletes/{id}/photos/{photoId}`) **una sola vez**. Si esa renovación también falla, la miniatura muestra «No se pudo cargar la foto» y no se reintenta en bucle.
- **Borrado** (`DELETE /athletes/{id}/photos/{photoId}`): al confirmar, la foto sale de la lista sin volver a pedirla. Un 404 también la quita de la lista.
- **Errores**: el 503 (almacenamiento no disponible) tiene su propio texto en la subida, el listado y el borrado; el resto muestra el mensaje del backend.

El código vive en `src/lib/progress-photos/` (tipos, reglas, validación del archivo, acciones, claves de caché, hooks y renovación de URL) y en `src/pages/progress/components/` (`ProgressPhotosCard`, `PhotoUploadForm`, `ProgressPhotoGrid`, `ProgressPhotoViewer`, `ProgressPhotoImage`). La subida multipart es `postForm` en `src/lib/api`, que también usa la foto de comidas (US-23).

Pruebas: unitarias en `src/lib/progress-photos/*.test.*` y `src/pages/progress/**/*.test.*` (validación previa, renovación de URL, caché al borrar, subida, visor y borrado) y E2E en `e2e/progress-photos.spec.ts`, que intercepta la API y las imágenes firmadas con Playwright.

### Comidas (US-23)

Comidas (`/meals`, solo el atleta, entrada «Comidas» en su menú, US-23) registra lo que comió hoy, con la fecha de hoy en la zona de la app. El tipo de comida (desayuno, almuerzo, merienda, cena, colación, pre y post-entrenamiento) se preselecciona según la hora (antes de las 11, desayuno; hasta las 15, almuerzo; hasta las 19, merienda; después, cena) y un toque lo cambia. La comida se arma con una descripción, con alimentos del catálogo y su cantidad en gramos (el buscador usa `GET /foods?name=&size=20`; cada alimento arranca con su porción de referencia), o con las dos cosas: hace falta al menos una. Las validaciones y los mensajes son los del backend: hasta 50 alimentos, cantidad mayor a 0 con hasta 5 enteros y 2 decimales, descripción de hasta 500 caracteres. Enter en el buscador agrega el primer resultado y no envía la comida.

La lista muestra las comidas del día (`GET /athletes/{id}/meals?date=`, sin paginación) con sus alimentos, cantidades y calorías. Una comida sin alimentos no tiene calorías calculables y muestra un guion, nunca 0. Editar abre la comida en el mismo formulario y la guarda completa (`PUT`, conserva el día de la comida); borrar pide confirmación (`DELETE`). Si la comida ya no existe (404), el formulario vuelve al alta y la lista se actualiza. Los errores 400 se muestran en el campo que corresponde (la cantidad de cada alimento o la descripción) y el resto en el aviso del formulario. La foto de comida es de la ola 2 (US-28).

Las calorías y los macros los calcula el backend. json-server no simula esta página (ruta anidada y buscador paginado): se prueba con el backend real o con `e2e/meals.spec.ts`, que intercepta la API y cubre también un celular.

### Resumen del día y navegación por días (US-24)

En `/meals` se puede mirar cualquier día hasta hoy, no más allá. Arriba de todo hay un selector de día: «Día anterior», «Día siguiente» (deshabilitado en hoy) y, si no es hoy, «Volver a hoy». El día va en la URL (`?date=AAAA-MM-DD`; hoy no lleva parámetro), así se vuelve a él con el historial del navegador y se puede compartir. Una fecha inválida (`2026-02-31`) o futura en la URL muestra hoy y corrige la URL. Al cambiar de día, una edición en curso se cancela y el aviso anterior desaparece. Tras navegar, el foco va al título del día, que el lector de pantalla anuncia.

Debajo, la tarjeta «Resumen del día» muestra las calorías y los gramos de proteínas, carbohidratos y grasas del día (`GET /athletes/{id}/meals/summary?date=`). Un día sin comidas da 0 en todo y «Sin comidas registradas este día». Con gramos, una barra muestra el reparto de los tres macros, con su lectura en texto (el reparto es por gramos: el front no calcula kcal). Si hay comidas sin datos nutricionales (solo descripción, sin alimentos), la tarjeta avisa que no entran en el total. Si el resumen falla, muestra el mensaje con «Reintentar» sin tocar la lista.

El alta, la edición y el borrado funcionan en el día que se mira: el alta se registra en ese día, y la edición conserva el suyo. Cada mutación invalida las consultas de comidas del atleta (el listado del día y su resumen) por prefijo.

El código vive en `src/pages/meals/`: tipos y acción del resumen (`types.ts`, `actions/get-daily-summary.ts`), el hook `hooks/use-daily-nutrition-summary.ts`, la clave de caché (`summary-key.ts`, bajo la clave de las comidas del atleta), las reglas de fecha (`day-navigation.ts`), el reparto de macros (`macro-share.ts`) y los componentes `components/DayNavigator.tsx` y `components/DailySummaryCard.tsx`.

Pruebas: unitarias en `src/pages/meals/**/*.test.*` (fechas de la URL, límites de la navegación, foco, resumen con datos, vacío y avisos, reparto, clave de caché, acción y la página con la URL y el alta en otro día) y el E2E `e2e/daily-nutrition.spec.ts`, que intercepta la API con un backend en memoria: navegación, URL inválida, día vacío, alta en un día anterior, error del resumen con «Reintentar» y un celular sin scroll horizontal. `e2e/meals.spec.ts` también intercepta el resumen.

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

## Registro de series en vivo (US-19)

En `/training/:sessionId`, cada ejercicio del día muestra una fila por serie prescrita (`1..sets`). La fila viene precargada con lo planificado (repeticiones y peso recomendado), así que completar una serie es un toque. Desde la misma fila se corrige la serie, se edita el RPE opcional o se omite con un motivo.

- Lógica: `src/lib/training-sessions/` (`putPerformedSet` y el hook `usePutPerformedSet`). La respuesta del PUT es la sesión completa y reemplaza la caché del detalle y de la sesión en progreso.
- Pantalla: `src/pages/training-session/` (`components/ExerciseSets.tsx` y `components/SetRow.tsx`; las reglas de cada campo están en `validation.ts` y el paso del borrador al cuerpo en `set-draft.ts`).
- Cada serie se envía con `PUT /api/athletes/{athleteId}/sessions/{sessionId}/exercises/{routineExerciseId}/sets/{setNumber}`. Reintentar reenvía el mismo cuerpo a la misma URL: el backend lo resuelve sin duplicar la serie. Las mutaciones de una misma sesión van en serie para que las respuestas no se pisen.
- Con la sesión fuera de curso (`FINISHED` o `CANCELLED`) las series se muestran sin controles y la pantalla avisa.
- Pruebas: `pnpm test -- --run src/pages/training-session src/lib/training-sessions` cubre validaciones, borrador, fila (completar, corregir, omitir, red, 409 y 400) y la pantalla. El E2E `e2e/log-sets.spec.ts` intercepta la API con un servidor falso en memoria y verifica que completar sea un toque y que el reintento no duplique.

## Finalizar o cancelar el entrenamiento (US-20)

En `/training/:sessionId`, el atleta cierra la sesión en curso desde el bloque de acciones que está debajo del título del día: **Finalizar entrenamiento** (queda `FINISHED`, con hora de fin y resumen) o **Cancelar entrenamiento** (queda `CANCELLED`, sin borrar lo registrado). Las dos piden confirmación con un diálogo accesible.

- Finalizar sin ninguna serie hecha no se bloquea, pero la confirmación avisa y ofrece cancelar en su lugar (CE-2). Las series que quedan sin registrar no cuentan como hechas.
- Lógica: `src/lib/training-sessions/` (`finishTrainingSession` y `cancelTrainingSession`, `POST .../finish` y `POST .../cancel` sin body; los hooks `useFinishTrainingSession` y `useCancelTrainingSession`). La respuesta reemplaza el detalle y, si era la sesión en progreso, `in-progress` queda en `null`, sin invalidar. Un 409 vuelve a pedir la sesión para mostrar su estado real.
- Pantalla: `src/pages/training-session/` (`components/TrainingSessionActions.tsx` con las dos confirmaciones, `components/TrainingSessionResult.tsx` con el resumen, y `end-session-copy.ts` con los textos y la confirmación según las series hechas).
- Resumen (solo `FINISHED`, también al abrir el detalle después): series hechas sobre prescritas, omitidas, sin registrar, volumen (kg) y duración. Cancelada: el aviso de solo lectura y la salida a «Mi rutina».
- Las acciones comparten la cola de mutaciones de la sesión con el registro de series: una finalización espera a que termine de guardarse una serie en curso.
- Pruebas: `pnpm test -- --run src/lib/training-sessions src/pages/training-session` cubre las acciones, la caché, los hooks (incluido el 409), los textos de confirmación, el resumen y la pantalla. El E2E `e2e/finish-training.spec.ts` intercepta la API y cubre finalizar con resumen (CA-1), cancelar y volver a Mi rutina (CA-2), finalizar sin series (CE-2), cancelar la confirmación, el 409 y el error del servidor.

## Historial de entrenamientos y revisión (US-21)

El historial muestra solo las sesiones cerradas (`FINISHED` y `CANCELLED`); la que está en progreso no aparece. Lo ven los dos roles con la misma pantalla y el mismo formulario de fechas, pero cada uno con su acción.

- **Atleta** (`/training-history`, entrada «Entrenamientos» en su menú): la lista con fecha, día, estado, cumplimiento («6 de 7 series») y la marca «Revisada». Al abrir una sesión ve el resumen, las series de cada ejercicio (hechas con peso, repeticiones y RPE; omitidas con su motivo; sin registrar) y la observación de su entrenador, o que todavía no la revisó. Solo lectura.
- **Entrenador** (`/athletes/:id`, sección «Entrenamientos» del perfil del atleta): el mismo historial y detalle, más el formulario de revisión. Marcar como revisada (o editar la revisión, que reemplaza la observación y la fecha) con una observación opcional de hasta 1000 caracteres, con contador. Solo se revisan las sesiones finalizadas: una cancelada muestra el aviso y no el formulario.
- **Filtro de fechas**: «Desde» y «Hasta» (inclusivas, sobre la fecha del entrenamiento). Cada cambio aplica el filtro si el rango es válido; si «Desde» es posterior a «Hasta» o la fecha no es válida, se avisa y la lista no cambia. «Quitar filtro de fechas» vuelve a todo el historial.
- Paginado de a 10 (`GET /athletes/{id}/sessions?from&to&page&size`). El detalle sale de `GET /athletes/{id}/sessions/{sessionId}`, el mismo de US-18 a US-20; al abrirlo, el foco va a su encabezado.
- Revisión: `PUT /athletes/{id}/sessions/{sessionId}/review` con `{ observation? }` (la observación vacía no se envía). Tras guardar se reemplaza el detalle y se vuelve a pedir el historial, así la marca «Revisada» se actualiza.
- Código: `src/lib/training-sessions/` (`get-training-history.ts`, `put-session-review.ts`, `use-training-history.ts` con `keepPreviousData`, `use-session-review.ts`, claves `trainingHistoryKey` y reglas de fechas y observación en `training-history-validation.ts`); componentes compartidos en `src/components/training-history/` (`TrainingHistory`, `HistoryFilter`, `HistoryList`, `SessionDetail`, `SessionSetsList`) con la revisión como composición (`renderReview`); la vista del atleta en `src/pages/training-history/` (`AthleteReviewNote`) y la del entrenador en `src/pages/athlete-profile/components/` (`TrainingHistorySection`, `CoachReviewForm`).
- Pruebas: `pnpm test -- --run src/lib/training-sessions src/components/training-history src/pages/athlete-profile src/pages/training-history` cubre acciones, claves, hooks, reglas de fechas y observación, la lista, el filtro, el detalle, el formulario de revisión y la nota del atleta. El E2E `e2e/training-history.spec.ts` intercepta la API y cubre los dos roles: el historial con filtro y detalle (CA-1, CA-4), la observación del entrenador (CA-3), revisar con observación y la marca en la lista (CA-2), la cancelada que no se revisa y que el atleta no ve controles de revisión (CE-1, CE-5).

## Alimentación del atleta y revisión de comidas (US-25)

El entrenador ve la alimentación de un atleta de su cartera en la sección «Alimentación» del perfil (`/athletes/:id`). No hay plan nutricional objetivo: la adherencia se mide como constancia de registro.

- **Semana** (por defecto): los 7 días que terminan hoy («Últimos 7 días»), con «Semana anterior», «Semana siguiente» (no pasa de hoy) y «Volver a esta semana». Muestra la constancia («3 de 7 días con comidas») y, por día, calorías, macros y cantidad de comidas (`GET /athletes/{id}/meals/overview?from&to`, siempre con el rango explícito). Sin comidas en el rango, un estado vacío. Elegir un día abre la vista «Día» en ese día.
- **Día**: «Día anterior», «Día siguiente» (no pasa de hoy) y «Volver a hoy»; el resumen del día de US-24 (`DailySummaryCard`, `GET .../meals/summary?date=`) y las comidas del día de US-23 (`GET .../meals?date=`) con su estado «Revisada el …» o «Pendiente de revisión», el comentario del entrenador si lo hay y la acción «Revisar» / «Editar revisión».
- **Revisión**: `PUT /athletes/{id}/meals/{mealId}/review` con `{ observation? }` (comentario opcional de hasta 1000 caracteres, con contador; vacío no se envía). Revisar de nuevo reemplaza el comentario. Tras guardar se invalidan las comidas del atleta por prefijo: la lista del día, su resumen y la semana (la clave del overview cuelga de la de las comidas). El 400 del comentario va al campo; 403 y 404, al aviso del formulario.
- **Errores**: un 400 del rango muestra el motivo del campo (por ejemplo «El rango no puede superar los 31 días») y un 403 el mensaje del backend, los dos sin «Reintentar»; el resto, con «Reintentar».
- **Atleta**: en `/meals`, una comida revisada muestra de forma discreta «Revisada por tu entrenador el …» y el comentario, solo lectura. Si el atleta edita la comida, el backend borra la revisión.
- Código: `src/lib/meals/` (`put-meal-review.ts`, `use-meal-review.ts`, `meal-review-validation.ts`, campo `review` en `Meal`); en `src/pages/athlete-profile/`: tipos (`types.ts`), acción y hook del overview (`actions/get-nutrition-overview.ts`, `hooks/use-nutrition-overview.ts`), clave (`nutrition-overview-key.ts`), reglas del rango y textos (`nutrition-range.ts`), errores (`nutrition-error.ts`) y los componentes `NutritionSection`, `NutritionWeek`, `NutritionDay`, `PeriodNavigator`, `CoachMealItem` y `MealReviewForm`; la nota del atleta en `src/pages/meals/components/MealReviewNote.tsx`.
- Pruebas: `pnpm test -- --run src/lib/meals src/pages/athlete-profile src/pages/meals` cubre la acción y el hook de la revisión, la validación, la acción y la clave del overview, el rango, los errores, el formulario de revisión, la sección (semana, navegación, vacío, 400, 403, día y revisión) y la nota del atleta. El E2E `e2e/meal-review.spec.ts` intercepta la API con un backend en memoria: semana con constancia, día y revisión con comentario, semana vacía y navegación, 403, un celular sin scroll horizontal y la vista del atleta.

## Panel del atleta (US-12)

En `/dashboard`, el atleta ve lo de hoy en cuatro tarjetas independientes: cada una tiene su carga, su error (con «Reintentar») y su estado vacío, así que si una falla las demás se siguen viendo. En móvil van en una columna con el entrenamiento arriba; desde `md` el entrenamiento y las observaciones ocupan todo el ancho y comidas y peso van lado a lado. El entrenador no ve este panel: tiene el suyo (ver «Panel del entrenador (US-11)»).

- **Entrenamiento de hoy:** la rutina activa (`GET /athletes/{id}/routine`) y la sesión en progreso (`GET .../sessions/in-progress`). Si hay una sesión abierta, solo se ofrece **Retomar** (va a `/training/:sessionId`). Si no, muestra el día que indica `nextDayId` (la rotación la calcula el backend, contrato 9.6) con sus ejercicios y **Iniciar entrenamiento**, que crea la sesión como en «Mi rutina». Un 409 lleva a retomar la que ya estaba abierta, sin mostrarlo como error; los 422 (rutina vencida, día sin ejercicios) muestran el texto del backend. Estados vacíos: sin rutina asignada, rutina vencida y rutina sin días.
- **Comidas de hoy:** el resumen del día (`GET .../meals/summary?date=`) con calorías, gramos de proteínas, hidratos y grasas, y la barra de reparto. Los tipos de comida salen del listado del día (`GET .../meals?date=`); si el listado falla, los totales se muestran igual. Sin comidas invita a registrar una; las comidas sin datos nutricionales se avisan como en la página de comidas. Enlace a `/meals`.
- **Último peso:** `GET .../weights?size=1`, con kilos, fecha y comentario. Sin registros invita a registrar el peso. Enlace a `/progress`.
- **Observaciones del entrenador:** muestra hasta 3 sesiones revisadas con texto (fecha, día, observación y fecha de revisión), a partir de `GET .../sessions?size=20`. Enlace a `/training-history`.
- **Notas de tu entrenador** (US-46): las notas que el entrenador dejó visibles, debajo de las observaciones (ver «Notas del entrenador (US-46)»).

El código vive en `src/pages/dashboard/`: `components/AthleteDashboard.tsx` (la grilla), las cuatro tarjetas (`TodayTrainingCard`, `TodayMealsCard`, `LatestWeightCard`, `TrainerNotesCard`) y las piezas compartidas (`CardError`, `CardSkeleton`, `DashboardCardHeader`); los hooks `hooks/use-start-today-training.ts` (iniciar con navegación y el 409) y `hooks/use-trainer-observations.ts` (el filtro de observaciones); y los helpers puros de `dashboard-format.ts` (día que toca, observaciones, máximo de 3). Reutiliza los hooks de `lib/athlete-routine`, `lib/training-sessions`, `lib/weights` y `lib/meals`, y del resumen de comidas `pages/meals/hooks/use-daily-nutrition-summary.ts` y `macro-share.ts`.

Desvíos y decisiones:

- La API de sesiones no filtra por revisión: el panel pide las últimas 20 sesiones cerradas y filtra las revisadas con texto. Una observación más vieja que esas 20 sesiones no aparece en el panel (el historial completo sigue en `/training-history`).
- Las consultas de peso y de comidas usan las mismas claves de caché que sus páginas, así que una alta o una edición en esas páginas refresca también el panel.

Pruebas: unitarias en `src/pages/dashboard/**/*.test.*` (helpers de día y observaciones, cada tarjeta con sus vacíos, errores y reintentos, iniciar, retomar y el 409, el panel con una tarjeta caída, y la página: el entrenador no ve el panel del atleta). El E2E `e2e/athlete-dashboard.spec.ts` intercepta la API y cubre: las cuatro tarjetas con datos, iniciar y abrir el entrenamiento (con el cuerpo del `POST`), retomar, los estados vacíos, una tarjeta caída sin tapar las demás, el escritorio con dos columnas, y en un celular de 360 px una sola columna sin scroll horizontal y el botón de iniciar visible y con más de 44 px de alto. Además, `e2e/login.spec.ts`, `e2e/logout.spec.ts` y `e2e/register-athlete.spec.ts` comprueban ahora la tarjeta «Entrenamiento de hoy» en lugar del texto provisorio «Panel del atleta».

## Progreso: evolución del peso y galería (US-29)

En `/progress`, arriba de «Últimos registros», el atleta ve la **evolución de su peso** en un gráfico propio en SVG (sin librerías). La línea une los registros de la más antigua a la más nueva; cada punto muestra su fecha y su valor al pasar el cursor, el último lleva su valor junto al punto y, debajo, «Ver los datos del gráfico» despliega la misma información en una tabla (para teclado y lectores de pantalla). El gráfico se describe con un texto que resume el rango.

- **Rango:** atajos de 30 días, 3 meses, 6 meses, 1 año y «Todo» (por defecto), más «Personalizado» con las fechas «Desde» y «Hasta». El rango viaja en la URL (`?from=AAAA-MM-DD&to=AAAA-MM-DD`): se puede volver atrás y compartir el enlace. Un rango con «desde» posterior a «hasta», o una fecha que no existe, se valida antes de pedir datos; si el backend responde 400, se muestra su mensaje.
- **Datos:** se piden todas las páginas del rango (`GET /athletes/{id}/weights` con `from`, `to` y `size=100`, siguiendo `totalPages`) y se ordenan de la más antigua a la más nueva. Alta y edición de un peso refrescan el gráfico. El hook está en `src/pages/progress/hooks/use-weight-evolution.ts`.
- **Un solo registro:** se dibuja solo el punto y un aviso explica que hace falta otro día para ver la línea.
- **Estados vacíos:** sin ningún registro, «Cargar mi peso» lleva el foco al campo de peso. Si hay registros fuera del rango, «No hay registros en este rango». Un error se muestra con «Reintentar», salvo el 400.
- **Galería:** las fotos ya llegan en orden cronológico (la más antigua primero). Sin fotos, «Subir mi primera foto» lleva el foco al selector de archivo. Una URL firmada vencida se renueva una sola vez (ver «Fotos de progreso»).

Los helpers puros (escala, rangos y validación) están en `src/pages/progress/weight-range.ts` y `weight-chart-scale.ts`, y se prueban en `*.test.ts`. El E2E `e2e/progress-charts.spec.ts` cubre el rango en la URL y su validación, el 400 del backend, los estados vacíos, un solo punto, el refresco tras un alta, la galería con la URL renovada y un celular de 360 px sin scroll horizontal.

## Progreso del atleta en la ficha (US-30)

En la ficha del atleta (`/athletes/:id`), debajo de las dos columnas y a todo el ancho, el entrenador ve el **progreso** del atleta con las mismas tarjetas que el atleta ve en `/progress` (US-29): «Evolución del peso» y «Fotos de progreso», con el `id` de la URL. No hay endpoints nuevos: se usan `GET /athletes/{id}/weights` (todas las páginas del rango, de a 100), `GET /athletes/{id}/photos` y, para una URL firmada vencida, `GET /athletes/{id}/photos/{photoId}` (se renueva una sola vez, con `use-progress-photo-url`).

- **Solo lectura:** registrar el peso y subir o borrar fotos son del atleta (el backend le responde 403 al entrenador). Las tarjetas reciben `readOnly`: el gráfico no ofrece «Cargar mi peso», la galería no muestra el formulario de subida y el visor no tiene «Borrar foto» (se puede navegar entre las fotos). La página `/progress` del atleta no cambia.
- **Rango:** como en `/progress`, el rango del gráfico viaja en la URL de la ficha (`/athletes/:id?from=…&to=…`).
- **Estados vacíos:** sin registros, «El atleta todavía no registró su peso»; con registros fuera del rango, «No hay registros en este rango»; sin fotos, «El atleta todavía no subió fotos de progreso». Si el almacenamiento no responde (503), «No pudimos cargar las fotos del atleta».
- **403 y 404:** los resuelve la ficha antes de mostrar el progreso: un atleta de otro entrenador o desvinculado muestra «Este atleta no está en tu cartera» y uno que no existe, «El atleta no existe». En los dos casos no se piden sus pesos ni sus fotos para el gráfico y la galería.

El código está en `src/pages/athlete-profile/components/ProgressSection.tsx`, que reutiliza `WeightEvolutionCard` y `ProgressPhotosCard` de `src/pages/progress/components/` (y con ellas `ProgressPhotoGrid` y `ProgressPhotoViewer`, que aceptan el modo de solo lectura).

Pruebas: unitarias en `WeightEvolutionCard.test.tsx`, `ProgressPhotosCard.test.tsx` (bloques «solo lectura») y `AthleteProfilePage.test.tsx` (el progreso del atleta de la URL sin controles de escritura, los estados vacíos y el 403 sin progreso). El E2E `e2e/coach-progress.spec.ts` intercepta la API y cubre el gráfico y la galería del atleta de la URL con la URL vencida renovada, que no haya formulario de peso, subida ni borrado, el rango en la URL de la ficha, los estados vacíos, y el 403 y el 404. `e2e/athlete-profile.spec.ts` responde ahora también el listado de fotos (vacío).

## Panel del entrenador (US-11)

En `/dashboard`, debajo del saludo y de «Agregar atleta» (los pone `DashboardPage`) y de la tarjeta de alertas (ver «Alertas (US-47)»), el entrenador ve el estado de su cartera para priorizar a quién atender, en cuatro tarjetas. Los datos llegan en una sola llamada, `GET /coaches/me/dashboard` (solo COACH; un atleta recibe 403 y no la pide), que se vuelve a pedir cada vez que se abre el panel.

- **Atletas activos:** los atletas de la cartera con la cuenta activa. Las otras tres métricas solo cuentan atletas activos.
- **Sin rutina vigente:** sin rutina asignada o con la rutina activa vencida.
- **Sesiones por revisar:** el número es el total de entrenamientos terminados sin revisar (no de atletas); cada atleta dice cuántos tiene («2 sesiones por revisar»). Con alguna pendiente, la tarjeta se tiñe de rojo, como «Requieren revisión» en la plantilla.
- **Sin peso reciente:** sin registro de peso en los últimos 7 días, con la fecha del último («Último registro: 1 de noviembre de 2026») o «Nunca registró su peso».

Cada tarjeta muestra el número y los atletas que lo componen, ordenados por apellido y nombre como los manda la API; cada nombre lleva a su ficha (`/athletes/:id`). Una lista larga se desplaza dentro de la tarjeta. Una métrica en 0 lo dice con un texto (por ejemplo, «Todos tus atletas activos tienen una rutina vigente.»).

- **Una métrica caída:** si el servidor no pudo calcular una, llega en `null` y su clave en `warnings` (la respuesta sigue siendo 200). Esa tarjeta muestra un aviso («No pudimos calcular esta métrica. El resto del panel está al día.») con «Reintentar», y las demás se ven normalmente.
- **Sin atletas:** con 0 atletas activos se muestra «Todavía no tenés atletas activos» con «Registrar atleta» (`/athletes/new`) en lugar de las tarjetas.
- **Error del pedido:** si falla la llamada entera (red o 5xx), el mensaje con «Reintentar».

El cliente vive en `src/lib/coach-dashboard/` (`get-coach-dashboard.ts`, los tipos del contrato y el hook `use-coach-dashboard.ts`); la pantalla, en `src/pages/dashboard/components/CoachDashboard.tsx` y `CoachMetricCard.tsx` (una tarjeta genérica: número, lista con links a la ficha, vacío y aviso), con los textos de cada atleta en `dashboard-format.ts`.

Pruebas: unitarias en `src/lib/coach-dashboard/*.test.*` (la llamada y el hook), `CoachDashboard.test.tsx` (las cuatro métricas y su orden, los links a la ficha, métricas en 0, una métrica caída con su reintento, la cartera vacía y el error del pedido), `dashboard-format.test.ts` y `DashboardPage.test.tsx` (el atleta no pide el panel del entrenador). El E2E `e2e/coach-dashboard.spec.ts` intercepta la API y cubre las métricas con sus atletas, el paso a la ficha, una métrica caída sin tapar las demás, la cartera vacía con el acceso al alta, un celular de 360 px sin scroll horizontal y que el atleta no la pida.

## Recuperación de contraseña (US-44)

Desde el login, «¿Olvidaste tu contraseña?» lleva a `/forgot-password`. Ahí se pide el email (`POST /auth/password-recovery` con `{ email }`, sin espacios alrededor). El backend responde siempre 202, exista o no el email, así que la confirmación no dice si está registrado: «Si ana@example.com está registrado, te enviamos un enlace para crear una contraseña nueva. Vence en 30 minutos.», con «Reenviar enlace» (el mismo email) y «Usar otro email». Si el backend no pudo enviar el mail (503), se muestra su mensaje y el formulario queda para reintentar. Con sesión, la página va al dashboard, como el login.

El link del mail es `/reset-password?token=...` (`paths.resetPassword`; si cambia la ruta, hay que cambiarla en el backend). La página pide la contraseña nueva y «Repetir contraseña» (solo se compara en el navegador: un error de tipeo obligaría a pedir otro enlace) con la misma política que el registro, y envía `POST /auth/password-reset` con `{ token, newPassword }`:

- **204:** el backend revoca todas las sesiones del usuario, así que el front borra la sesión guardada en este navegador (si había) y la caché, y lleva al login con el aviso «Actualizaste tu contraseña. Iniciá sesión con la nueva.» (una sola vez, como el del logout).
- **400 con `fieldErrors` en `newPassword`:** no cumple la política; el mensaje va al campo.
- **400 sin `fieldErrors`:** el token venció, ya se usó o no es válido; se muestra el mensaje del backend con «Solicitar un nuevo enlace» (`/forgot-password`).
- **Sin token en la URL:** el mismo aviso, sin llamar a la API.

El código está en `src/pages/forgot-password/` y `src/pages/reset-password/` (acción, hook y formulario de cada paso); las URLs públicas, en `src/lib/auth/auth-interceptors.ts`.

Pruebas: unitarias de las acciones, de `use-reset-password` (limpia sesión y caché solo con el 204), de las dos páginas (validaciones, confirmación neutra, reenvío, 503, los dos 400, sin token, con sesión), del login (link y aviso), del interceptor (sin Bearer ni refresh) y de `validatePassword` (72 bytes). El E2E `e2e/password-recovery.spec.ts` intercepta la API y cubre el pedido desde el login con el cuerpo enviado, el 503, el cambio con una sesión vieja guardada (sin `Authorization` y con la sesión borrada al terminar), el token vencido, la política, el enlace sin token y un celular de 360 px.

## Notas del entrenador (US-46)

El entrenador escribe notas sobre un atleta de su cartera desde la ficha (`/athletes/:id`), en la sección «Notas», al final de la columna principal. El formulario tiene título (obligatorio, hasta 150 caracteres), contenido (obligatorio, hasta 2000, con contador) y tipo: «Privada» (por defecto: solo la ve él) o «Visible para el atleta». Se envía `POST /athletes/{id}/notes` con `{ title, content, type }` y los textos recortados; los errores del 400 van a su campo y el 403 al aviso general. Se pueden escribir notas a un atleta desactivado. Debajo, la lista con todas sus notas de la más reciente a la más antigua (`GET /athletes/{id}/notes`), con la fecha, el badge del tipo y, en las visibles, «Sin leer» o «Leída el …» (de `readAt`).

El atleta ve las notas visibles en su panel, en la tarjeta «Notas de tu entrenador» (el backend nunca le manda las privadas), con el contador de sin leer. Las sin leer se destacan y tienen «Marcar como leída» (`PATCH /athletes/{id}/notes/{noteId}/read`, idempotente); después muestran «Leída el …». Un 404 (la nota se volvió privada o ya no existe) muestra el mensaje y refresca la lista; otro error se muestra en la nota y se puede reintentar. Las notas no se editan ni se borran (no hay endpoints).

El cliente vive en `src/lib/notes/` (acciones, hooks, tipos, límites y validaciones); la ficha, en `src/pages/athlete-profile/components/NotesSection.tsx`, `NoteForm.tsx` y `NoteItem.tsx`; el panel, en `src/pages/dashboard/components/AthleteNotesCard.tsx`.

Pruebas: unitarias en `src/lib/notes/*.test.*` (acciones, hooks e invalidación, validaciones), `NotesSection.test.tsx` (lista, vacío, error, alta, 400 y 403), `AthleteNotesCard.test.tsx` (marcar como leída, 404, errores) y en la ficha y el panel (la sección aparece; con 403 no se piden las notas). El E2E `e2e/notes.spec.ts` simula el backend en memoria: el entrenador ve y escribe notas privadas y visibles (con el cuerpo del `POST`), no envía una vacía, y el atleta ve solo las visibles, marca una como leída y en un celular de 360 px no hay scroll horizontal.

## Alertas (US-47)

Arriba del panel del entrenador, la tarjeta «Requiere atención» lista las alertas pendientes de su cartera (`GET /alerts`, solo COACH: el atleta no la pide) en el orden del backend, críticas primero y después por fecha. Cada una muestra el nombre del atleta (link a su ficha), la severidad («Crítica», «Advertencia» o «Info»), el mensaje que arma el backend y la fecha. Tiene su propia carga y error con «Reintentar», y se muestra aunque fallen las métricas o la cartera esté vacía.

«Atender» envía `PATCH /alerts/{id}/handle` y refresca la lista: la alerta desaparece y no vuelve por 7 días aunque la condición siga (lo decide el backend). Un 409 (ya estaba atendida, por ejemplo desde otra pestaña) se toma como resuelto, con un aviso informativo; un 403 o 404 muestra el mensaje del backend. En todos los casos se refresca. La fecha de atención (`handledAt`) no se muestra: la tarjeta solo lista pendientes.

Algunas causas (sin rutina, sin registro de peso, sesiones sin revisar) se parecen a las métricas del panel: es intencional, la alerta es la que se atiende.

El cliente vive en `src/lib/alerts/`; la tarjeta, en `src/pages/dashboard/components/CoachAlertsCard.tsx`, con los textos y tonos de severidad en `alert-format.ts`.

Pruebas: unitarias en `src/lib/alerts/*.test.*` (acciones, hooks; invalida en 200, 409, 403 y 404), `alert-format.test.ts`, `CoachAlertsCard.test.tsx` (orden, severidades, link a la ficha, vacío, error, atender, 409, 403 y 404), `CoachDashboard.test.tsx` (las alertas arriba y que una caída no tape a la otra) y `DashboardPage.test.tsx` (el atleta no las pide). El E2E `e2e/coach-alerts.spec.ts` simula el backend en memoria: orden y severidades, atender, 409, 404, el paso a la ficha, vacío, un celular de 360 px y que el atleta no las pida. `e2e/coach-dashboard.spec.ts`, `athlete-dashboard.spec.ts` y `athlete-profile.spec.ts` responden ahora las alertas y las notas (vacías).
