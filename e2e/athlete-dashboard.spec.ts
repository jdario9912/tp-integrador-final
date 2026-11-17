import { expect, test, type Locator, type Page } from '@playwright/test'
import { paths, trainingPath } from '../src/router/paths.ts'
import {
  apiError,
  athlete,
  coach,
  routeCurrentUser,
  seedSession,
} from './auth-helpers.ts'

// el panel del atleta (US-12) consulta sus datos del día. La API se intercepta: cada test define
// qué responde cada consulta. Playwright prueba las rutas de la última a la primera: las
// específicas se registran al final
const ROUTINE_URL = /\/api\/athletes\/[^/]+\/routine(\?|$)/
const SESSIONS_URL = /\/api\/athletes\/[^/]+\/sessions(\?|$)/
const IN_PROGRESS_URL = /\/api\/athletes\/[^/]+\/sessions\/in-progress(\?|$)/
const SESSION_DETAIL_URL = /\/api\/athletes\/[^/]+\/sessions\/[^/?]+(\?|$)/
const SUMMARY_URL = /\/api\/athletes\/[^/]+\/meals\/summary(\?|$)/
const MEALS_URL = /\/api\/athletes\/[^/]+\/meals(\?|$)/
const WEIGHTS_URL = /\/api\/athletes\/[^/]+\/weights(\?|$)/

const TORSO_ID = 'c3d4e5f6-0718-4293-a4b5-c6d7e8f90a1b'
const LEGS_ID = 'd4e5f607-1829-43a4-b5c6-d7e8f90a1b2c'
const SESSION_ID = '4f5a6b7c-8d9e-4f0a-8b1c-2d3e4f5a6b7c'

// GET /athletes/{athleteId}/routine: vigente, con el día 1 (Torso) como el que toca
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
    days: [
      {
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
            techniqueNote: null,
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
      },
      {
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
      },
    ],
  },
  ...overrides,
})

// sesión de US-18 con el día 1 (la forma de TrainingSessionResponse, 10.2)
const trainingSession = (overrides: Record<string, unknown> = {}) => ({
  id: SESSION_ID,
  status: 'IN_PROGRESS',
  sessionDate: '2026-11-11',
  startedAt: '2026-11-11T22:15:03.512345Z',
  assignmentId: '8b1e4c2d-5f6a-4b7c-9d8e-0f1a2b3c4d5e',
  routineId: '5a6b7c8d-9e0f-4a1b-8c2d-3e4f5a6b7c8d',
  routineName: 'Fuerza 2 días',
  day: activeRoutine().routine.days[0],
  performedSets: [],
  endedAt: null,
  summary: {
    prescribedSets: 7,
    doneSets: 0,
    skippedSets: 0,
    pendingSets: 7,
    volumeKg: 0,
  },
  review: null,
  ...overrides,
})

const summaryOfDay = (overrides: Record<string, unknown> = {}) => ({
  date: '2026-11-16',
  caloriesKcal: 507.5,
  proteinG: 46.5,
  carbsG: 56,
  fatG: 6,
  mealCount: 2,
  mealsWithoutNutrition: 0,
  ...overrides,
})

const lunch = {
  id: '7d8e9f0a-1b2c-4d3e-8f4a-5b6c7d8e9f0a',
  date: '2026-11-16',
  type: 'LUNCH',
  description: null,
  totalCaloriesKcal: 247.5,
  items: [],
  createdAt: '2026-11-16T16:40:12.345678Z',
  updatedAt: '2026-11-16T16:40:12.345678Z',
}

const latestWeight = {
  id: '6d0f8e2a-1b3c-4d5e-8f9a-0b1c2d3e4f5a',
  date: '2026-11-06',
  weightKg: 72.5,
  comment: 'En ayunas',
  createdAt: '2026-11-06T11:20:31.123456Z',
  updatedAt: '2026-11-06T11:20:31.123456Z',
}

const pageOf = <T>(content: T[]) => ({
  content,
  page: 0,
  size: 20,
  totalElements: content.length,
  totalPages: content.length > 0 ? 1 : 0,
})

// sesión cerrada con observación del entrenador, y otra revisada sin texto
const historyWithObservation = {
  id: SESSION_ID,
  sessionDate: '2026-11-11',
  status: 'FINISHED',
  startedAt: '2026-11-11T22:15:03.512345Z',
  routineName: 'Fuerza 2 días',
  dayNumber: 1,
  dayName: 'Torso',
  endedAt: '2026-11-11T23:02:47.104812Z',
  summary: {
    prescribedSets: 7,
    doneSets: 6,
    skippedSets: 1,
    pendingSets: 0,
    volumeKg: 1000,
  },
  review: {
    reviewedAt: '2026-11-12T09:00:00Z',
    observation: 'Buen trabajo en el press. Subí el peso la semana que viene.',
  },
}

const historyWithoutNote = {
  ...historyWithObservation,
  id: '9a8b7c6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d',
  sessionDate: '2026-11-08',
  review: null,
}

// respuestas por defecto: un atleta con rutina, comidas, peso y una observación
type Replies = {
  routine?: { status: number; json?: unknown }
  inProgress?: { status: number; json?: unknown }
  summary?: { status: number; json?: unknown }
  weights?: { status: number; json?: unknown }
  history?: { status: number; json?: unknown }
}

const defaultReplies = (): Required<Replies> => ({
  routine: { status: 200, json: activeRoutine() },
  inProgress: { status: 204 },
  summary: { status: 200, json: summaryOfDay() },
  weights: { status: 200, json: pageOf([latestWeight]) },
  history: {
    status: 200,
    json: pageOf([historyWithObservation, historyWithoutNote]),
  },
})

// registra las respuestas del panel. Devuelve los pedidos de inicio para comprobar su cuerpo
const routeDashboard = async (page: Page, replies: Replies = {}) => {
  const current = { ...defaultReplies(), ...replies }
  const startRequests: unknown[] = []

  await page.route(MEALS_URL, (route) =>
    route.fulfill({ status: 200, json: [lunch] }),
  )
  await page.route(SUMMARY_URL, (route) =>
    route.fulfill({
      status: current.summary.status,
      json: current.summary.json,
    }),
  )
  await page.route(WEIGHTS_URL, (route) =>
    route.fulfill({
      status: current.weights.status,
      json: current.weights.json,
    }),
  )
  await page.route(ROUTINE_URL, (route) =>
    route.fulfill({
      status: current.routine.status,
      json: current.routine.json,
    }),
  )
  await page.route(SESSIONS_URL, (route) => {
    if (route.request().method() === 'POST') {
      startRequests.push(route.request().postDataJSON())
      return route.fulfill({ status: 201, json: trainingSession() })
    }
    return route.fulfill({
      status: current.history.status,
      json: current.history.json,
    })
  })
  // la pantalla del entrenamiento se abre al iniciar o retomar: se responde la sesión. Va antes de
  // in-progress, que también cae en su patrón y debe ganarle
  await page.route(SESSION_DETAIL_URL, (route) =>
    route.fulfill({ status: 200, json: trainingSession() }),
  )
  await page.route(IN_PROGRESS_URL, (route) =>
    route.fulfill({
      status: current.inProgress.status,
      json: current.inProgress.json,
    }),
  )

  return startRequests
}

const openDashboard = async (page: Page) => {
  await page.goto(paths.dashboard)
  await expect(
    page.getByRole('heading', { name: 'Dashboard', level: 1 }),
  ).toBeVisible()
}

const card = (page: Page, name: string) =>
  page.getByRole('region', { name, exact: true })

const TITLES = {
  training: 'Entrenamiento de hoy',
  meals: 'Comidas de hoy',
  weight: 'Último peso',
  notes: 'Observaciones del entrenador',
}

test.describe('como atleta', () => {
  test.beforeEach(async ({ page }) => {
    await seedSession(page, athlete, 'access-1')
    await routeCurrentUser(page, athlete)
  })

  test('muestra el día que toca, las comidas, el último peso y las observaciones', async ({
    page,
  }) => {
    await routeDashboard(page)

    await openDashboard(page)

    const training = card(page, TITLES.training)
    await expect(
      training.getByRole('heading', { name: 'Día 1: Torso', level: 3 }),
    ).toBeVisible()
    await expect(training).toContainText('Press de banca')
    await expect(
      training.getByRole('button', { name: 'Iniciar entrenamiento' }),
    ).toBeEnabled()

    await expect(card(page, TITLES.meals)).toContainText('507,5 kcal')
    await expect(card(page, TITLES.weight)).toContainText('72,5 kg')
    await expect(card(page, TITLES.notes)).toContainText(
      'Buen trabajo en el press',
    )
    // la sesión sin texto no se muestra como observación
    await expect(card(page, TITLES.notes).getByRole('listitem')).toHaveCount(1)
  })

  test('iniciar el día que toca crea la sesión y abre el entrenamiento', async ({
    page,
  }) => {
    const startRequests = await routeDashboard(page)
    await openDashboard(page)

    await card(page, TITLES.training)
      .getByRole('button', { name: 'Iniciar entrenamiento' })
      .click()

    await expect(page).toHaveURL(new RegExp(`${trainingPath(SESSION_ID)}$`))
    expect(startRequests).toEqual([{ routineDayId: TORSO_ID }])
  })

  test('con un entrenamiento en curso ofrece retomarlo y no iniciar otro', async ({
    page,
  }) => {
    await routeDashboard(page, {
      inProgress: { status: 200, json: trainingSession() },
    })
    await openDashboard(page)

    const training = card(page, TITLES.training)
    await expect(
      training.getByText('Tenés un entrenamiento en curso'),
    ).toBeVisible()
    await expect(
      training.getByRole('button', { name: 'Iniciar entrenamiento' }),
    ).toHaveCount(0)

    await training.getByRole('button', { name: 'Retomar' }).click()
    await expect(page).toHaveURL(new RegExp(`${trainingPath(SESSION_ID)}$`))
  })

  test('sin datos muestra estados vacíos con un camino para salir de ellos', async ({
    page,
  }) => {
    await routeDashboard(page, {
      routine: { status: 204 },
      history: { status: 200, json: pageOf([historyWithoutNote]) },
      summary: {
        status: 200,
        json: summaryOfDay({
          mealCount: 0,
          caloriesKcal: 0,
          proteinG: 0,
          carbsG: 0,
          fatG: 0,
        }),
      },
      weights: { status: 200, json: pageOf([]) },
    })
    await openDashboard(page)

    await expect(
      card(page, TITLES.training).getByText(
        'Tu entrenador aún no te asignó una rutina',
      ),
    ).toBeVisible()
    await expect(
      card(page, TITLES.meals).getByRole('link', { name: 'Registrar comida' }),
    ).toHaveAttribute('href', paths.meals)
    await expect(
      card(page, TITLES.weight).getByRole('link', { name: 'Registrar peso' }),
    ).toHaveAttribute('href', paths.progress)
    await expect(
      card(page, TITLES.notes).getByText(
        'Tu entrenador todavía no dejó observaciones',
      ),
    ).toBeVisible()
  })

  test('si una tarjeta falla, las demás siguen mostrando sus datos', async ({
    page,
  }) => {
    await routeDashboard(page, {
      weights: {
        status: 500,
        json: apiError(
          500,
          'Ocurrió un error inesperado. Intentá nuevamente más tarde',
          '/weights',
        ).json,
      },
    })
    await openDashboard(page)

    const weight = card(page, TITLES.weight)
    await expect(weight.getByRole('alert')).toBeVisible()
    await expect(
      weight.getByRole('button', { name: 'Reintentar' }),
    ).toBeVisible()

    await expect(card(page, TITLES.training)).toContainText('Press de banca')
    await expect(card(page, TITLES.meals)).toContainText('507,5 kcal')
    await expect(card(page, TITLES.notes)).toContainText(
      'Buen trabajo en el press',
    )
  })

  test('en escritorio comidas y peso van lado a lado, debajo del día que toca', async ({
    page,
  }) => {
    await routeDashboard(page)
    await openDashboard(page)

    const training = await card(page, TITLES.training).boundingBox()
    const meals = await card(page, TITLES.meals).boundingBox()
    const weight = await card(page, TITLES.weight).boundingBox()
    expect(training && meals && weight).toBeTruthy()
    expect(meals!.y).toBeGreaterThanOrEqual(training!.y + training!.height)
    expect(Math.abs(meals!.y - weight!.y)).toBeLessThan(2)
    expect(weight!.x).toBeGreaterThan(meals!.x)
  })
})

// en un celular todo va en una columna y no hay scroll horizontal
test.describe('en un celular', () => {
  test.use({ viewport: { width: 360, height: 780 } })

  test.beforeEach(async ({ page }) => {
    await seedSession(page, athlete, 'access-1')
    await routeCurrentUser(page, athlete)
  })

  test('las cuatro tarjetas van en una columna, sin scroll horizontal', async ({
    page,
  }) => {
    await routeDashboard(page)
    await openDashboard(page)

    const boxes = await Promise.all(
      [TITLES.training, TITLES.meals, TITLES.weight, TITLES.notes].map(
        async (name) => card(page, name).boundingBox(),
      ),
    )
    const [training, meals, weight, notes] = boxes
    expect(boxes.every(Boolean)).toBe(true)
    for (const box of boxes) {
      expect(box!.x).toBeGreaterThanOrEqual(0)
      expect(box!.x + box!.width).toBeLessThanOrEqual(360)
    }
    expect(meals!.y).toBeGreaterThanOrEqual(training!.y + training!.height)
    expect(weight!.y).toBeGreaterThanOrEqual(meals!.y + meals!.height)
    expect(notes!.y).toBeGreaterThanOrEqual(weight!.y + weight!.height)

    // en texto: el tsconfig de los E2E no incluye los tipos del DOM
    const scrollsSideways = await page.evaluate(
      'document.documentElement.scrollWidth > document.documentElement.clientWidth',
    )
    expect(scrollsSideways).toBe(false)
  })

  test('el botón de iniciar queda a la vista y se puede tocar', async ({
    page,
  }) => {
    await routeDashboard(page)
    await openDashboard(page)

    const start: Locator = card(page, TITLES.training).getByRole('button', {
      name: 'Iniciar entrenamiento',
    })
    await expect(start).toBeInViewport()
    const box = await start.boundingBox()
    expect(box!.height).toBeGreaterThanOrEqual(44)
  })
})

test.describe('como entrenador', () => {
  test('el entrenador no ve el panel del atleta', async ({ page }) => {
    await seedSession(page, coach, 'access-1')
    await routeCurrentUser(page, coach)

    await page.goto(paths.dashboard)

    await expect(
      page.getByRole('heading', { name: '¡Bienvenido de nuevo, Ana!' }),
    ).toBeVisible()
    await expect(
      page.getByRole('region', { name: TITLES.training }),
    ).toHaveCount(0)
  })
})
