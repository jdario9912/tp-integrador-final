import { expect, test, type Page, type Request } from '@playwright/test'
import { exerciseEditPath, paths } from '../src/router/paths.ts'
import {
  apiError,
  athlete,
  coach,
  routeCurrentUser,
  seedSession,
} from './auth-helpers.ts'

const MUSCLE_GROUPS_URL = /\/api\/muscle-groups$/
// GET con query params y POST del alta
const EXERCISES_URL = /\/api\/exercises(\?.*)?$/
const EXERCISE_URL = /\/api\/exercises\/[^/?]+$/

const muscleGroups = [
  { code: 'CHEST', name: 'Pecho', region: 'UPPER' },
  { code: 'BACK', name: 'Espalda', region: 'UPPER' },
  { code: 'SHOULDERS', name: 'Hombros', region: 'UPPER' },
  { code: 'BICEPS', name: 'Bíceps', region: 'UPPER' },
  { code: 'TRICEPS', name: 'Tríceps', region: 'UPPER' },
  { code: 'FOREARMS', name: 'Antebrazos', region: 'UPPER' },
  { code: 'ABS', name: 'Abdominales', region: 'CORE' },
  { code: 'QUADRICEPS', name: 'Cuádriceps', region: 'LOWER' },
  { code: 'HAMSTRINGS', name: 'Isquiotibiales', region: 'LOWER' },
  { code: 'GLUTES', name: 'Glúteos', region: 'LOWER' },
  { code: 'CALVES', name: 'Pantorrillas', region: 'LOWER' },
  { code: 'FULL_BODY', name: 'Cuerpo completo', region: 'FULL' },
]

type ExerciseJson = {
  id: string
  name: string
  description: string | null
  muscleGroup: string
  videoUrl: string | null
  global: boolean
  // solo del mock: dueño del ejercicio (null = global) y baja lógica
  ownerId: string | null
  deleted?: boolean
}

const exerciseJson = (
  id: number,
  overrides: Partial<ExerciseJson>,
): ExerciseJson => ({
  id: `00000000-0000-4000-8000-${String(id).padStart(12, '0')}`,
  name: `Ejercicio ${id}`,
  description: null,
  muscleGroup: 'CHEST',
  videoUrl: null,
  global: false,
  ownerId: coach.id,
  ...overrides,
})

const benchPress = () =>
  exerciseJson(1, {
    name: 'Press de banca',
    description: 'Agarre medio, bajar al pecho.',
    global: true,
    ownerId: null,
  })
const squat = () =>
  exerciseJson(2, {
    name: 'Sentadilla',
    muscleGroup: 'QUADRICEPS',
    global: true,
    ownerId: null,
  })
const hipThrust = () =>
  exerciseJson(3, {
    name: 'Hip thrust',
    muscleGroup: 'GLUTES',
    videoUrl: 'https://youtu.be/hip-thrust',
  })
// de otro entrenador: no aparece en el listado y su detalle responde 403
const foreignRow = () =>
  exerciseJson(4, { name: 'Remo ajeno', muscleGroup: 'BACK', ownerId: 'otro' })

// lo que devuelve la API: sin los campos internos del mock
const toResponse = ({
  ownerId: _ownerId,
  deleted: _deleted,
  ...rest
}: ExerciseJson) => rest

// imita al backend de US-38 en memoria: globales + propios, filtros, alta, edición y baja lógica
const routeBackend = async (page: Page) => {
  let exercises = [benchPress(), squat(), hipThrust(), foreignRow()]
  let nextId = 100
  const requests: Request[] = []

  const visible = () =>
    exercises.filter(
      (e) => !e.deleted && (e.ownerId === null || e.ownerId === coach.id),
    )

  const isDuplicate = (name: string, exceptId?: string) =>
    visible().some(
      (e) =>
        e.id !== exceptId && e.name.toLowerCase() === name.trim().toLowerCase(),
    )

  await page.route(MUSCLE_GROUPS_URL, (route) =>
    route.fulfill({ status: 200, json: muscleGroups }),
  )

  await page.route(EXERCISES_URL, (route) => {
    const request = route.request()
    requests.push(request)
    if (request.method() === 'POST') {
      const body = request.postDataJSON()
      if (isDuplicate(body.name)) {
        return route.fulfill(
          apiError(
            409,
            `Ya existe un ejercicio llamado ${body.name}`,
            '/exercises',
          ),
        )
      }
      const created = exerciseJson(nextId++, { ...body, ownerId: coach.id })
      exercises = [...exercises, created]
      return route.fulfill({ status: 201, json: toResponse(created) })
    }

    const params = new URL(request.url()).searchParams
    const name = params.get('name')?.toLowerCase()
    const muscleGroup = params.get('muscleGroup')
    const pageNumber = Number(params.get('page') ?? 0)
    const size = Number(params.get('size') ?? 20)
    const filtered = visible()
      .filter(
        (e) =>
          (!name || e.name.toLowerCase().includes(name)) &&
          (!muscleGroup || e.muscleGroup === muscleGroup),
      )
      .sort((a, b) => a.name.localeCompare(b.name))
    return route.fulfill({
      status: 200,
      json: {
        content: filtered
          .slice(pageNumber * size, (pageNumber + 1) * size)
          .map(toResponse),
        page: pageNumber,
        size,
        totalElements: filtered.length,
        totalPages: Math.ceil(filtered.length / size),
      },
    })
  })

  await page.route(EXERCISE_URL, (route) => {
    const request = route.request()
    requests.push(request)
    const path = new URL(request.url()).pathname.replace('/api', '')
    const id = path.split('/').at(-1)
    const exercise = exercises.find((e) => e.id === id && !e.deleted)
    if (!exercise) {
      return route.fulfill(apiError(404, 'Ejercicio no encontrado', path))
    }
    const isOwn = exercise.ownerId === coach.id
    if (request.method() === 'GET') {
      return exercise.ownerId === null || isOwn
        ? route.fulfill({ status: 200, json: toResponse(exercise) })
        : route.fulfill(apiError(403, 'No tenés acceso a este ejercicio', path))
    }
    if (!isOwn) {
      return route.fulfill(
        apiError(403, 'No podés modificar este ejercicio', path),
      )
    }
    if (request.method() === 'DELETE') {
      exercises = exercises.map((e) =>
        e.id === id ? { ...e, deleted: true } : e,
      )
      return route.fulfill({ status: 204 })
    }
    const body = request.postDataJSON()
    if (isDuplicate(body.name, id)) {
      return route.fulfill(
        apiError(409, `Ya existe un ejercicio llamado ${body.name}`, path),
      )
    }
    const updated = { ...exercise, ...body }
    exercises = exercises.map((e) => (e.id === id ? updated : e))
    return route.fulfill({ status: 200, json: toResponse(updated) })
  })

  return requests
}

const paramsOf = (request: Request) =>
  Object.fromEntries(new URL(request.url()).searchParams)

const card = (page: Page, name: string) => page.getByRole('region', { name })

const exerciseCards = (page: Page) =>
  page.getByRole('list', { name: 'Ejercicios' }).getByRole('listitem')

const muscleGroupFilter = (page: Page) =>
  page.getByRole('combobox', { name: /Grupo muscular/ })

// por texto: el skeleton del listado también es un status
const notice = (page: Page, text: string) =>
  page.getByRole('status').filter({ hasText: text })

test.describe('como entrenador', () => {
  test.beforeEach(async ({ page }) => {
    await seedSession(page, coach, 'access-1')
    await routeCurrentUser(page, coach)
  })

  test('entra al catálogo desde el aside y ve los globales y los propios', async ({
    page,
  }) => {
    const requests = await routeBackend(page)

    await page.goto(paths.dashboard)
    await page
      .getByRole('navigation', { name: 'Principal' })
      .getByRole('link', { name: 'Ejercicios' })
      .click()

    await expect(page).toHaveURL(paths.exercises)
    await expect(
      page.getByRole('heading', { name: 'Ejercicios', level: 1 }),
    ).toBeVisible()
    await expect(exerciseCards(page)).toHaveCount(3)
    await expect(card(page, 'Press de banca')).toContainText('Pecho')
    await expect(card(page, 'Press de banca')).toContainText('Global')
    await expect(card(page, 'Hip thrust')).toContainText('Glúteos')
    await expect(card(page, 'Hip thrust')).toContainText('Mío')
    await expect(card(page, 'Remo ajeno')).toHaveCount(0)

    // global: solo lectura
    await expect(
      card(page, 'Press de banca').getByRole('link', { name: /Editar/ }),
    ).toHaveCount(0)
    const video = card(page, 'Hip thrust').getByRole('link', {
      name: /Ver video de Hip thrust/,
    })
    await expect(video).toHaveAttribute('href', 'https://youtu.be/hip-thrust')
    await expect(video).toHaveAttribute('target', '_blank')

    const list = requests.find((r) => r.url().includes('/exercises?'))!
    expect(list.headers().authorization).toBe('Bearer access-1')
    expect(paramsOf(list)).toEqual({ page: '0', size: '20' })
  })

  test('filtra por nombre y por grupo muscular', async ({ page }) => {
    const requests = await routeBackend(page)
    await page.goto(paths.exercises)
    await expect(exerciseCards(page)).toHaveCount(3)

    await page.getByRole('searchbox', { name: 'Buscar por nombre' }).fill('SEN')
    await expect(exerciseCards(page)).toHaveCount(1)
    await expect(card(page, 'Sentadilla')).toBeVisible()
    await expect(page).toHaveURL(`${paths.exercises}?name=SEN`)

    await page.getByRole('searchbox', { name: 'Buscar por nombre' }).fill('')
    await muscleGroupFilter(page).selectOption({ label: 'Glúteos' })
    await expect(exerciseCards(page)).toHaveCount(1)
    await expect(card(page, 'Hip thrust')).toBeVisible()
    await expect(page).toHaveURL(`${paths.exercises}?muscleGroup=GLUTES`)
    await expect
      .poll(() => paramsOf(requests.at(-1)!))
      .toEqual({ page: '0', size: '20', muscleGroup: 'GLUTES' })

    await muscleGroupFilter(page).selectOption({ label: 'Espalda' })
    await expect(page.getByText('No se encontraron ejercicios')).toBeVisible()
  })

  test('crea un ejercicio y lo ve en el catálogo', async ({ page }) => {
    const requests = await routeBackend(page)
    await page.goto(paths.exercises)

    await page.getByRole('button', { name: 'Nuevo ejercicio' }).click()
    await expect(page).toHaveURL(paths.newExercise)
    // la URL cambia antes de que React muestre la página nueva (la navegación es una transición): sin esperar
    // el título, con la CPU cargada "Nombre" y "Grupo muscular" caen en los filtros del listado
    await expect(
      page.getByRole('heading', { name: 'Nuevo ejercicio', level: 1 }),
    ).toBeVisible()

    await page.getByLabel('Nombre').fill('Curl martillo')
    await page.getByLabel('Grupo muscular').selectOption({ label: 'Bíceps' })
    await page.getByLabel('Video').fill('https://youtu.be/curl')
    await page.getByRole('button', { name: 'Crear ejercicio' }).click()

    await expect(page).toHaveURL(paths.exercises)
    await expect(
      notice(page, 'Creaste el ejercicio Curl martillo.'),
    ).toBeVisible()
    await expect(card(page, 'Curl martillo')).toContainText('Bíceps')
    await expect(card(page, 'Curl martillo')).toContainText('Mío')

    const post = requests.find((r) => r.method() === 'POST')
    expect(post?.postDataJSON()).toEqual({
      name: 'Curl martillo',
      muscleGroup: 'BICEPS',
      description: null,
      videoUrl: 'https://youtu.be/curl',
    })
  })

  test('valida el formulario antes de enviar', async ({ page }) => {
    const requests = await routeBackend(page)
    await page.goto(paths.newExercise)

    await page.getByRole('button', { name: 'Crear ejercicio' }).click()

    await expect(page.getByText('El nombre es obligatorio')).toBeVisible()
    await expect(
      page.getByText('El grupo muscular es obligatorio'),
    ).toBeVisible()

    // el link se valida al salir del campo
    await page.getByLabel('Video').fill('youtube.com/abc')
    await page.getByLabel('Video').blur()
    await expect(
      page.getByText(
        'Ingresá un link válido que empiece con http:// o https://',
      ),
    ).toBeVisible()
    expect(requests.some((r) => r.method() === 'POST')).toBe(false)
  })

  test('muestra el mensaje del backend si el nombre ya existe', async ({
    page,
  }) => {
    await routeBackend(page)
    await page.goto(paths.newExercise)

    await page.getByLabel('Nombre').fill('hip thrust')
    await page.getByLabel('Grupo muscular').selectOption({ label: 'Glúteos' })
    await page.getByRole('button', { name: 'Crear ejercicio' }).click()

    await expect(page.getByRole('alert')).toContainText(
      'Ya existe un ejercicio llamado hip thrust',
    )
    await expect(page).toHaveURL(paths.newExercise)
  })

  test('muestra los errores por campo del backend', async ({ page }) => {
    await routeBackend(page)
    await page.route(EXERCISES_URL, (route) =>
      route.request().method() === 'POST'
        ? route.fulfill({
            status: 400,
            json: {
              ...apiError(
                400,
                'La solicitud tiene campos inválidos',
                '/exercises',
              ).json,
              error: 'Bad Request',
              fieldErrors: [
                { field: 'name', message: 'El nombre no es válido' },
              ],
            },
          })
        : route.fallback(),
    )
    await page.goto(paths.newExercise)

    await page.getByLabel('Nombre').fill('Plancha')
    await page
      .getByLabel('Grupo muscular')
      .selectOption({ label: 'Abdominales' })
    await page.getByRole('button', { name: 'Crear ejercicio' }).click()

    await expect(page.getByText('El nombre no es válido')).toBeVisible()
    await expect(page.getByLabel('Nombre')).toHaveAttribute(
      'aria-invalid',
      'true',
    )
  })

  test('edita un ejercicio propio desde el catálogo', async ({ page }) => {
    const requests = await routeBackend(page)
    await page.goto(paths.exercises)

    await card(page, 'Hip thrust')
      .getByRole('link', { name: 'Editar Hip thrust' })
      .click()
    await expect(page).toHaveURL(exerciseEditPath(hipThrust().id))
    await expect(page.getByLabel('Grupo muscular')).toHaveValue('GLUTES')

    await page.getByLabel('Nombre').fill('Hip thrust con barra')
    await page.getByLabel('Video').fill('')
    await page.getByLabel('Descripción').fill('Pausa arriba')
    await page.getByRole('button', { name: 'Guardar cambios' }).click()

    await expect(page).toHaveURL(paths.exercises)
    await expect(
      notice(page, 'Guardaste los cambios de Hip thrust con barra.'),
    ).toBeVisible()
    await expect(card(page, 'Hip thrust con barra')).toContainText(
      'Pausa arriba',
    )

    const put = requests.find((r) => r.method() === 'PUT')
    expect(put?.postDataJSON()).toEqual({
      name: 'Hip thrust con barra',
      muscleGroup: 'GLUTES',
      description: 'Pausa arriba',
      videoUrl: null,
    })
  })

  test('un ejercicio global se ve en modo lectura', async ({ page }) => {
    await routeBackend(page)

    await page.goto(exerciseEditPath(benchPress().id))

    await expect(
      page.getByRole('heading', { name: 'Press de banca', level: 1 }),
    ).toBeVisible()
    await expect(page.getByText('no editarlo ni eliminarlo')).toBeVisible()
    await expect(page.getByText('Agarre medio, bajar al pecho.')).toBeVisible()
    await expect(page.getByRole('textbox')).toHaveCount(0)
    await expect(page.getByRole('button', { name: /Eliminar/ })).toHaveCount(0)
  })

  test('un ejercicio de otro entrenador muestra el aviso del backend', async ({
    page,
  }) => {
    await routeBackend(page)

    await page.goto(exerciseEditPath(foreignRow().id))

    await expect(page.getByText('No encontramos este ejercicio')).toBeVisible()
    await expect(
      page.getByText('No tenés acceso a este ejercicio'),
    ).toBeVisible()
  })

  test('elimina un ejercicio propio y deja de aparecer en el catálogo', async ({
    page,
  }) => {
    const requests = await routeBackend(page)
    await page.goto(exerciseEditPath(hipThrust().id))

    await page.getByRole('button', { name: 'Eliminar' }).click()
    const dialog = page.getByRole('dialog', { name: '¿Eliminar Hip thrust?' })
    await expect(dialog).toContainText(
      'Las rutinas que ya lo usan no se modifican.',
    )
    await dialog.getByRole('button', { name: 'Eliminar' }).click()

    await expect(page).toHaveURL(paths.exercises)
    await expect(
      notice(page, 'Eliminaste el ejercicio Hip thrust.'),
    ).toBeVisible()
    await expect(exerciseCards(page)).toHaveCount(2)
    await expect(card(page, 'Hip thrust')).toHaveCount(0)
    expect(requests.some((r) => r.method() === 'DELETE')).toBe(true)
  })
})

test('un atleta no puede entrar al catálogo de ejercicios', async ({
  page,
}) => {
  await seedSession(page, athlete, 'access-1')
  await routeCurrentUser(page, athlete)

  await page.goto(paths.exercises)

  await expect(page).toHaveURL(paths.dashboard)
  await expect(
    page
      .getByRole('navigation', { name: 'Principal' })
      .getByRole('link', { name: 'Ejercicios' }),
  ).toHaveCount(0)
})
