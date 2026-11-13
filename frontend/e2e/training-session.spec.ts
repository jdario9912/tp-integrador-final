import {
  expect,
  test,
  type Page,
  type Request,
  type Route,
} from '@playwright/test'
import { todayInAppTimeZone } from '../src/lib/iso-date.ts'
import { paths, trainingPath } from '../src/router/paths.ts'
import {
  apiError,
  athlete,
  coach,
  routeCurrentUser,
  seedSession,
} from './auth-helpers.ts'

const ROUTINE_URL = /\/api\/athletes\/[^/]+\/routine$/
const MUSCLE_GROUPS_URL = /\/api\/muscle-groups$/
const SESSIONS_URL = /\/api\/athletes\/[^/]+\/sessions$/
const IN_PROGRESS_URL = /\/api\/athletes\/[^/]+\/sessions\/in-progress$/

const TORSO_ID = 'c3d4e5f6-0718-4293-a4b5-c6d7e8f90a1b'
const LEGS_ID = 'd4e5f607-1829-43a4-b5c6-d7e8f90a1b2c'
const SESSION_ID = '4f5a6b7c-8d9e-4f0a-8b1c-2d3e4f5a6b7c'
const SESSION_URL = new RegExp(`/api/athletes/[^/]+/sessions/${SESSION_ID}$`)

const START = 'Iniciar entrenamiento'

const torso = {
  id: TORSO_ID,
  dayNumber: 1,
  name: 'Torso',
  exercises: [
    {
      id: 'e1f2a3b4-c5d6-4e7f-8a9b-0c1d2e3f4a5b',
      exerciseId: '0b1c2d3e-4f5a-4b6c-9d7e-8f9a0b1c2d3e',
      exerciseName: 'Press de banca',
      muscleGroup: 'CHEST',
      sortOrder: 0,
      sets: 4,
      reps: 8,
      recommendedWeight: 62.5,
      rest: 120,
      rirRpe: 'RIR 2',
      techniqueNote: 'Bajar controlado hasta tocar el pecho',
    },
    {
      id: 'f2a3b4c5-d6e7-4f80-9b0c-1d2e3f4a5b6c',
      exerciseId: '1c2d3e4f-5a6b-4c7d-8e9f-0a1b2c3d4e5f',
      exerciseName: 'Remo con barra',
      muscleGroup: 'BACK',
      sortOrder: 1,
      sets: 3,
      reps: 10,
      recommendedWeight: null,
      rest: 90,
      rirRpe: null,
      techniqueNote: null,
    },
  ],
}

const legs = {
  id: LEGS_ID,
  dayNumber: 2,
  name: 'Pierna',
  exercises: [
    {
      id: 'a3b4c5d6-e7f8-4091-8c1d-2e3f4a5b6c7d',
      exerciseId: '2d3e4f5a-6b7c-4d8e-9f0a-1b2c3d4e5f6a',
      exerciseName: 'Sentadilla',
      muscleGroup: 'QUADRICEPS',
      sortOrder: 0,
      sets: 5,
      reps: 5,
      recommendedWeight: 80,
      rest: 180,
      rirRpe: 'RPE 8.5',
      techniqueNote: null,
    },
  ],
}

// respuesta de GET /athletes/{athleteId}/routine (contrato de API, 9.3)
const activeRoutine = (overrides: Record<string, unknown> = {}) => ({
  assignmentId: '8b1e4c2d-5f6a-4b7c-9d8e-0f1a2b3c4d5e',
  assignmentDate: '2026-11-03',
  endDate: '2026-12-28',
  expired: false,
  nextDayId: TORSO_ID,
  routine: {
    id: '5a6b7c8d-9e0f-4a1b-8c2d-3e4f5a6b7c8d',
    name: 'Fuerza 2 días',
    description: null,
    goal: 'Fuerza',
    daysPerWeek: 2,
    durationWeeks: 8,
    days: [torso, legs],
  },
  ...overrides,
})

// TrainingSessionResponse (contrato de API, 10.3): iniciada hoy a las 19:15 de Argentina
const startedSession = (overrides: Record<string, unknown> = {}) => ({
  id: SESSION_ID,
  status: 'IN_PROGRESS',
  sessionDate: todayInAppTimeZone(),
  startedAt: '2026-11-11T22:15:03.512345Z',
  assignmentId: '8b1e4c2d-5f6a-4b7c-9d8e-0f1a2b3c4d5e',
  routineId: '5a6b7c8d-9e0f-4a1b-8c2d-3e4f5a6b7c8d',
  routineName: 'Fuerza 2 días',
  day: torso,
  ...overrides,
})

const muscleGroups = [
  { code: 'CHEST', name: 'Pecho', region: 'UPPER' },
  { code: 'BACK', name: 'Espalda', region: 'UPPER' },
  { code: 'QUADRICEPS', name: 'Cuádriceps', region: 'LOWER' },
]

type ReplyOptions = NonNullable<Parameters<Route['fulfill']>[0]>

// responde con lo que devuelva `reply` en cada pedido del método indicado y guarda los pedidos
const routeApi = async (
  page: Page,
  url: RegExp,
  method: string,
  reply: () => ReplyOptions,
) => {
  const requests: Request[] = []
  await page.route(url, (route) => {
    if (route.request().method() !== method) return route.fallback()
    requests.push(route.request())
    return route.fulfill(reply())
  })
  return requests
}

// la sesión en progreso: 200 con la que haya, 204 sin ninguna
const routeInProgress = (page: Page, current: () => object | null) =>
  routeApi(page, IN_PROGRESS_URL, 'GET', () => {
    const session = current()
    return session ? { status: 200, json: session } : { status: 204 }
  })

const routeRoutine = (page: Page, routine = activeRoutine()) =>
  routeApi(page, ROUTINE_URL, 'GET', () => ({ status: 200, json: routine }))

const routeDetail = (page: Page, reply: () => ReplyOptions) =>
  routeApi(page, SESSION_URL, 'GET', reply)

const exerciseItems = (page: Page) =>
  page.getByRole('list', { name: 'Ejercicios' }).getByRole('listitem')

const inProgressNotice = (page: Page, name: string) =>
  page.getByRole('region', { name })

// la URL cambia antes de que React muestre la página (la navegación es una transición)
const openMyRoutine = async (page: Page) => {
  await page.goto(paths.myRoutine)
  await expect(
    page.getByRole('heading', { name: 'Mi rutina', level: 1 }),
  ).toBeVisible()
  await expect(exerciseItems(page).first()).toBeVisible()
}

const expectTrainingScreen = async (page: Page) => {
  await expect(page).toHaveURL(trainingPath(SESSION_ID))
  await expect(
    page.getByRole('heading', { name: 'Entrenamiento en curso', level: 1 }),
  ).toBeVisible()
}

const setUpAthlete = async (page: Page) => {
  await seedSession(page, athlete, 'access-1')
  await routeCurrentUser(page, athlete)
  await page.route(MUSCLE_GROUPS_URL, (route) =>
    route.fulfill({ status: 200, json: muscleGroups }),
  )
}

test.describe('como atleta', () => {
  test.beforeEach(async ({ page }) => {
    await setUpAthlete(page)
  })

  test('inicia el entrenamiento del día que toca y llega a la pantalla (CA-1)', async ({
    page,
  }) => {
    let inProgress: object | null = null
    await routeRoutine(page)
    await routeInProgress(page, () => inProgress)
    const posts = await routeApi(page, SESSIONS_URL, 'POST', () => {
      inProgress = startedSession()
      return {
        status: 201,
        json: inProgress,
        headers: {
          Location: `/api/athletes/${athlete.id}/sessions/${SESSION_ID}`,
        },
      }
    })
    await routeDetail(page, () => ({ status: 200, json: startedSession() }))
    await openMyRoutine(page)

    await page
      .getByRole('tabpanel')
      .getByRole('button', { name: START })
      .click()

    await expectTrainingScreen(page)
    await expect(
      page.getByRole('navigation', { name: 'Ubicación' }),
    ).toContainText('Entrenamiento')
    await expect(page.getByText('Fuerza 2 días')).toBeVisible()
    await expect(page.getByText('Empezaste hoy a las 19:15')).toBeVisible()
    await expect(
      page.getByRole('heading', { name: 'Día 1: Torso', level: 2 }),
    ).toBeVisible()
    await expect(exerciseItems(page)).toHaveCount(2)
    await expect(exerciseItems(page).first()).toContainText('Press de banca')
    await expect(exerciseItems(page).first()).toContainText('Pecho')
    await expect(exerciseItems(page).first()).toContainText('4 × 8')

    expect(posts).toHaveLength(1)
    expect(new URL(posts[0].url()).pathname).toBe(
      `/api/athletes/${athlete.id}/sessions`,
    )
    expect(posts[0].postDataJSON()).toEqual({ routineDayId: TORSO_ID })
    expect(posts[0].headers().authorization).toBe('Bearer access-1')
  })

  test('inicia otro día de la rutina', async ({ page }) => {
    await routeRoutine(page)
    await routeInProgress(page, () => null)
    const posts = await routeApi(page, SESSIONS_URL, 'POST', () => ({
      status: 201,
      json: startedSession({ day: legs }),
    }))
    await routeDetail(page, () => ({
      status: 200,
      json: startedSession({ day: legs }),
    }))
    await openMyRoutine(page)

    await page.getByRole('tab', { name: 'Día 2: Pierna', exact: true }).click()
    await page.getByRole('button', { name: START }).click()

    await expectTrainingScreen(page)
    await expect(
      page.getByRole('heading', { name: 'Día 2: Pierna', level: 2 }),
    ).toBeVisible()
    expect(posts[0].postDataJSON()).toEqual({ routineDayId: LEGS_ID })
  })

  test('retoma desde Mi rutina el entrenamiento en curso (CA-2)', async ({
    page,
  }) => {
    await routeRoutine(page)
    await routeInProgress(page, () => startedSession())
    const posts = await routeApi(page, SESSIONS_URL, 'POST', () => ({
      status: 201,
      json: startedSession(),
    }))
    await routeDetail(page, () => ({ status: 200, json: startedSession() }))
    await openMyRoutine(page)

    const notice = inProgressNotice(page, 'Tenés un entrenamiento en curso')
    await expect(notice).toContainText('Día 1: Torso, desde las 19:15.')
    await expect(page.getByRole('button', { name: START })).toHaveCount(0)

    await notice.getByRole('button', { name: 'Retomar' }).click()

    await expectTrainingScreen(page)
    await expect(exerciseItems(page)).toHaveCount(2)
    expect(posts).toHaveLength(0)
  })

  test('si ya había uno en curso (409) ofrece retomarlo (CE-1)', async ({
    page,
  }) => {
    // otra pestaña lo inició después de que se cargó Mi rutina
    let inProgress: object | null = null
    await routeRoutine(page)
    const inProgressRequests = await routeInProgress(page, () => inProgress)
    await routeApi(page, SESSIONS_URL, 'POST', () => {
      inProgress = startedSession()
      return apiError(
        409,
        'Ya tenés un entrenamiento en curso. Retomalo para continuar',
        `/athletes/${athlete.id}/sessions`,
      )
    })
    await routeDetail(page, () => ({ status: 200, json: startedSession() }))
    await openMyRoutine(page)

    await page.getByRole('button', { name: START }).click()

    const notice = inProgressNotice(page, 'Ya tenés un entrenamiento en curso')
    await expect(notice).toContainText(
      'Día 1: Torso, desde las 19:15. Retomalo para continuar.',
    )
    // el aviso recibe el foco: el botón Iniciar ya no está
    await expect(notice.locator('..')).toBeFocused()
    await expect(page.getByRole('button', { name: START })).toHaveCount(0)
    await expect(page.getByRole('alert')).toHaveCount(0)
    // se volvió a preguntar por la sesión en progreso después del 409
    expect(inProgressRequests.length).toBeGreaterThanOrEqual(2)

    await notice.getByRole('button', { name: 'Retomar' }).click()
    await expectTrainingScreen(page)
  })

  test('un 422 muestra el mensaje del backend', async ({ page }) => {
    await routeRoutine(page)
    await routeInProgress(page, () => null)
    await routeApi(page, SESSIONS_URL, 'POST', () =>
      apiError(
        422,
        'El día elegido no tiene ejercicios cargados',
        `/athletes/${athlete.id}/sessions`,
      ),
    )
    await openMyRoutine(page)

    await page.getByRole('button', { name: START }).click()

    await expect(page.getByRole('alert')).toContainText(
      'El día elegido no tiene ejercicios cargados',
    )
    await expect(page).toHaveURL(paths.myRoutine)
    await expect(page.getByRole('button', { name: START })).toBeEnabled()
  })

  test('con la rutina vencida no ofrece iniciar (CE-3)', async ({ page }) => {
    await routeRoutine(
      page,
      activeRoutine({
        assignmentDate: '2026-09-01',
        endDate: '2026-09-28',
        expired: true,
      }),
    )
    await routeInProgress(page, () => null)

    await openMyRoutine(page)

    await expect(page.getByRole('note')).toContainText(
      'Rutina vencida: terminó el 28 de septiembre de 2026.',
    )
    await expect(exerciseItems(page)).toHaveCount(2)
    await expect(page.getByRole('button', { name: START })).toHaveCount(0)
  })

  test('un entrenamiento que no existe muestra el aviso y la salida a Mi rutina', async ({
    page,
  }) => {
    await routeDetail(page, () =>
      apiError(
        404,
        `No existe la sesión de entrenamiento con id ${SESSION_ID}`,
        `/athletes/${athlete.id}/sessions/${SESSION_ID}`,
      ),
    )

    await page.goto(trainingPath(SESSION_ID))

    await expect(
      page.getByText('No encontramos este entrenamiento'),
    ).toBeVisible()
    await expect(
      page.getByRole('link', { name: 'Volver a Mi rutina' }),
    ).toBeVisible()
  })
})

test.describe('en móvil', () => {
  test.use({ viewport: { width: 375, height: 740 } })

  test.beforeEach(async ({ page }) => {
    await setUpAthlete(page)
  })

  test('inicia desde Mi rutina y sigue el entrenamiento sin scroll horizontal', async ({
    page,
  }) => {
    await routeRoutine(page)
    await routeInProgress(page, () => null)
    await routeApi(page, SESSIONS_URL, 'POST', () => ({
      status: 201,
      json: startedSession(),
    }))
    await routeDetail(page, () => ({ status: 200, json: startedSession() }))
    await openMyRoutine(page)

    // expresión como string: los E2E no tipan el DOM del navegador
    const overflows = () =>
      page.evaluate(
        'document.documentElement.scrollWidth > document.documentElement.clientWidth',
      )

    const start = page.getByRole('button', { name: START })
    await expect(start).toBeInViewport()
    expect(await overflows()).toBe(false)

    await start.click()

    await expectTrainingScreen(page)
    await expect(page.getByText('Empezaste hoy a las 19:15')).toBeVisible()
    await expect(exerciseItems(page)).toHaveCount(2)
    expect(await overflows()).toBe(false)
  })
})

test('un entrenador no puede entrar a la pantalla del entrenamiento', async ({
  page,
}) => {
  await seedSession(page, coach, 'access-1')
  await routeCurrentUser(page, coach)

  await page.goto(trainingPath(SESSION_ID))

  await expect(page).toHaveURL(paths.dashboard)
})
