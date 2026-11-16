import {
  expect,
  test,
  type Page,
  type Request,
  type Route,
} from '@playwright/test'
import { athleteProfilePath, paths } from '../src/router/paths.ts'
import {
  apiError,
  athlete,
  coach,
  routeCurrentUser,
  seedSession,
} from './auth-helpers.ts'

// US-21: historial de entrenamientos y revisión del entrenador. La API va interceptada: el estado
// de las sesiones vive en un objeto y cada pedido responde desde ahí, como el backend (contrato 25)

const HISTORY_URL = /\/api\/athletes\/[^/]+\/sessions(\?.*)?$/
const DETAIL_ID = '4f5a6b7c-8d9e-4f0a-8b1c-2d3e4f5a6b7c'
const CANCELLED_ID = '5a6b7c8d-9e0f-4a1b-8c2d-3e4f5a6b7c8e'
const DETAIL_URL = new RegExp(
  `/api/athletes/[^/]+/sessions/(${DETAIL_ID}|${CANCELLED_ID})$`,
)
const REVIEW_URL = new RegExp(
  `/api/athletes/[^/]+/sessions/${DETAIL_ID}/review$`,
)
// perfil del entrenador (US-09, US-16, US-26): se muestra junto al historial
const ATHLETE_URL = /\/api\/athletes\/[^/?]+$/
const WEIGHTS_URL = /\/api\/athletes\/[^/]+\/weights(\?.*)?$/
const ASSIGNMENTS_URL = /\/api\/athletes\/[^/]+\/assignments(\?.*)?$/

const TORSO_ID = 'c3d4e5f6-0718-4293-a4b5-c6d7e8f90a1b'
const BENCH_ID = 'e1f2a3b4-c5d6-4e7f-8a9b-0c1d2e3f4a5b'
const ROW_ID = 'f2a3b4c5-d6e7-4f80-9b0c-1d2e3f4a5b6c'

// el día del entrenamiento: 4 series de press y 3 de remo, 7 en total
const torso = {
  id: TORSO_ID,
  dayNumber: 1,
  name: 'Torso',
  exercises: [
    {
      id: BENCH_ID,
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
      id: ROW_ID,
      exerciseId: '1c2d3e4f-5a6b-4c7d-8e9f-0a1b2c3d4e5f',
      exerciseName: 'Remo con barra',
      muscleGroup: 'BACK',
      sortOrder: 1,
      sets: 3,
      reps: 10,
      recommendedWeight: 40,
      rest: 90,
      rirRpe: null,
      techniqueNote: null,
    },
  ],
}

type Review = { reviewedAt: string; observation: string | null }

// lo que el atleta registró en la sesión finalizada: una serie hecha y una omitida
const detailSets = [
  {
    id: 'serie-1',
    routineExerciseId: BENCH_ID,
    setNumber: 1,
    status: 'DONE',
    weight: 62.5,
    reps: 8,
    rpe: 8,
    skipReason: null,
  },
  {
    id: 'serie-2',
    routineExerciseId: BENCH_ID,
    setNumber: 2,
    status: 'SKIPPED',
    weight: null,
    reps: null,
    rpe: null,
    skipReason: 'Molestia en el hombro',
  },
]

// el backend simulado: dos sesiones cerradas. La finalizada del 11/11 tiene una serie hecha (500
// kg de volumen) y una omitida; la cancelada del 5/11 no tiene series
type SessionState = {
  id: string
  status: 'FINISHED' | 'CANCELLED'
  sessionDate: string
  dayName: string
  review: Review | null
}

const initialSessions = (review: Review | null = null): SessionState[] => [
  {
    id: DETAIL_ID,
    status: 'FINISHED',
    sessionDate: '2026-11-11',
    dayName: 'Torso',
    review,
  },
  {
    id: CANCELLED_ID,
    status: 'CANCELLED',
    sessionDate: '2026-11-05',
    dayName: 'Torso',
    review: null,
  },
]

const historyItem = (state: SessionState) => ({
  id: state.id,
  sessionDate: state.sessionDate,
  status: state.status,
  startedAt: `${state.sessionDate}T19:15:00-03:00`,
  routineName: 'Fuerza 2 días',
  dayNumber: 1,
  dayName: state.dayName,
  endedAt: `${state.sessionDate}T20:20:00-03:00`,
  summary:
    state.id === DETAIL_ID
      ? {
          prescribedSets: 7,
          doneSets: 1,
          skippedSets: 1,
          pendingSets: 5,
          volumeKg: 500,
        }
      : {
          prescribedSets: 7,
          doneSets: 0,
          skippedSets: 0,
          pendingSets: 7,
          volumeKg: 0,
        },
  review: state.review,
})

// TrainingSessionResponse del detalle (contrato 10.2 y 14.2), con la revisión (contrato 25)
const detailJson = (state: SessionState) => ({
  ...historyItem(state),
  assignmentId: '8b1e4c2d-5f6a-4b7c-9d8e-0f1a2b3c4d5e',
  routineId: '5a6b7c8d-9e0f-4a1b-8c2d-3e4f5a6b7c8d',
  day: torso,
  performedSets: state.id === DETAIL_ID ? detailSets : [],
})

// el historial se filtra por fechas (inclusive) y se pagina; el detalle sale del estado
const fakeHistoryApi = async (
  page: Page,
  {
    sessions = initialSessions(),
    reviewStatus = 200,
  }: {
    sessions?: SessionState[]
    reviewStatus?: number
  } = {},
) => {
  const reviews: Request[] = []

  await page.route(HISTORY_URL, (route) => {
    if (route.request().method() !== 'GET') return route.fallback()
    const url = new URL(route.request().url())
    const from = url.searchParams.get('from')
    const to = url.searchParams.get('to')
    const content = sessions
      .filter(
        (s) => (!from || s.sessionDate >= from) && (!to || s.sessionDate <= to),
      )
      .map(historyItem)
    return route.fulfill({
      status: 200,
      json: {
        content,
        page: 0,
        size: 10,
        totalElements: content.length,
        totalPages: content.length > 0 ? 1 : 0,
      },
    })
  })

  await page.route(DETAIL_URL, (route: Route) => {
    if (route.request().method() !== 'GET') return route.fallback()
    const id = route.request().url().split('/').pop() ?? ''
    const state = sessions.find((s) => s.id === id)
    return state
      ? route.fulfill({ status: 200, json: detailJson(state) })
      : route.fulfill(
          apiError(404, 'No existe la sesión de entrenamiento', '/sessions'),
        )
  })

  await page.route(REVIEW_URL, (route) => {
    if (route.request().method() !== 'PUT') return route.fallback()
    reviews.push(route.request())
    const state = sessions.find((s) => s.id === DETAIL_ID)
    if (reviewStatus !== 200 || !state) {
      return route.fulfill(
        apiError(
          422,
          'La sesión de entrenamiento todavía no está finalizada',
          '/review',
        ),
      )
    }
    const body = route.request().postDataJSON() as { observation?: string }
    state.review = {
      reviewedAt: '2026-11-14T20:00:00Z',
      observation: body.observation ?? null,
    }
    return route.fulfill({ status: 200, json: detailJson(state) })
  })

  return { reviews }
}

const heading = (page: Page, name: string) =>
  page.getByRole('heading', { name, level: 1 })

const historyList = (page: Page, name = 'Entrenamientos cerrados') =>
  page.getByRole('list', { name })

test.describe('como atleta · historial de entrenamientos (US-21)', () => {
  test.beforeEach(async ({ page }) => {
    await seedSession(page, athlete, 'access-1')
    await routeCurrentUser(page, athlete)
  })

  test('ve sus entrenamientos cerrados, filtra por fechas y abre el detalle (CA-1, CA-4)', async ({
    page,
  }) => {
    await fakeHistoryApi(page)
    await page.goto(paths.trainingHistory)

    await expect(heading(page, 'Entrenamientos')).toBeVisible()
    await expect(
      page.getByRole('navigation', { name: 'Ubicación' }),
    ).toContainText('Entrenamientos')
    await expect(
      page.getByRole('navigation', { name: 'Principal' }).getByRole('link', {
        name: 'Entrenamientos',
      }),
    ).toHaveAttribute('href', paths.trainingHistory)

    const list = historyList(page)
    await expect(list.getByRole('listitem')).toHaveCount(2)
    await expect(list).toContainText('Finalizada')
    await expect(list).toContainText('Cancelada')
    await expect(list).toContainText('1 de 7 series')

    // el rango desde el 8 deja solo la sesión del 11
    await page.getByLabel('Desde').fill('2026-11-08')
    await expect(list.getByRole('listitem')).toHaveCount(1)
    await expect(list).toContainText('Día 1 · Torso')

    // desde posterior a hasta: se avisa y la lista no cambia
    await page.getByLabel('Hasta').fill('2026-11-01')
    await expect(page.getByRole('alert')).toContainText(
      'no puede ser posterior',
    )
    await expect(list.getByRole('listitem')).toHaveCount(1)

    await page.getByRole('button', { name: 'Quitar filtro de fechas' }).click()
    await expect(list.getByRole('listitem')).toHaveCount(2)

    await list
      .getByRole('button', { name: /Día 1 · Torso/ })
      .first()
      .click()

    const detail = page.getByRole('heading', {
      name: 'Detalle del entrenamiento',
    })
    await expect(detail).toBeFocused()
    const region = page.getByRole('region', {
      name: 'Detalle del entrenamiento',
    })
    await expect(region).toContainText('Press de banca')
    await expect(region).toContainText('62,5 kg × 8 repeticiones · RPE 8')
    await expect(region).toContainText('Omitida: Molestia en el hombro')
    await expect(region).toContainText('Series hechas')
    await expect(region).toContainText(
      'Tu entrenador todavía no revisó este entrenamiento.',
    )
  })

  test('ve la observación de su entrenador cuando ya revisó la sesión (CA-3)', async ({
    page,
  }) => {
    await fakeHistoryApi(page, {
      sessions: initialSessions({
        reviewedAt: '2026-11-14T20:00:00Z',
        observation: 'Buen ritmo. La próxima, más descanso entre series.',
      }),
    })
    await page.goto(paths.trainingHistory)

    await historyList(page)
      .getByRole('button', { name: /Día 1 · Torso/ })
      .first()
      .click()

    const note = page.getByRole('region', {
      name: 'Observación de tu entrenador',
    })
    await expect(note).toContainText('Revisado el 14 de noviembre de 2026')
    await expect(note).toContainText(
      'Buen ritmo. La próxima, más descanso entre series.',
    )
  })

  test('el atleta ve el detalle sin controles de revisión: solo el entrenador revisa (CE-5)', async ({
    page,
  }) => {
    await fakeHistoryApi(page)
    await page.goto(paths.trainingHistory)

    await historyList(page)
      .getByRole('button', { name: /Día 1 · Torso/ })
      .first()
      .click()

    await expect(
      page.getByRole('button', {
        name: /Marcar como revisada|Guardar revisión/,
      }),
    ).toHaveCount(0)
  })
})

test.describe('como entrenador · revisión desde el perfil del atleta (US-21)', () => {
  test.beforeEach(async ({ page }) => {
    await seedSession(page, coach, 'access-1')
    await routeCurrentUser(page, coach)
  })

  test('revisa una sesión finalizada con observación y la lista la marca (CA-2)', async ({
    page,
  }) => {
    const { reviews } = await fakeHistoryApi(page)
    await routeAthleteProfile(page)
    await page.goto(athleteProfilePath(athlete.id))

    const section = page.getByRole('region', { name: 'Entrenamientos' })
    await expect(section).toBeVisible()
    await expect(historyList(page)).toBeVisible()
    await expect(historyList(page).getByRole('listitem')).toHaveCount(2)

    await historyList(page)
      .getByRole('button', { name: /Día 1 · Torso/ })
      .first()
      .click()

    const detail = page.getByRole('region', {
      name: 'Detalle del entrenamiento',
    })
    await expect(detail).toContainText('Press de banca')
    await expect(detail.getByText('Todavía no está revisado.')).toBeVisible()

    await detail.getByLabel('Observación').fill('Buen ritmo, seguí así')
    await detail.getByRole('button', { name: 'Marcar como revisada' }).click()

    await expect(
      detail
        .getByRole('status')
        .filter({ hasText: 'Marcaste el entrenamiento como revisado.' }),
    ).toBeVisible()
    expect(reviews).toHaveLength(1)
    expect(reviews[0].postDataJSON()).toEqual({
      observation: 'Buen ritmo, seguí así',
    })
    expect(reviews[0].url()).toContain(`/sessions/${DETAIL_ID}/review`)

    // el historial se vuelve a pedir y la sesión aparece marcada como revisada
    await expect(
      historyList(page).getByRole('listitem').filter({ hasText: 'Revisada' }),
    ).toHaveCount(1)
  })

  test('una sesión cancelada no se revisa y lo avisa (CE-1)', async ({
    page,
  }) => {
    await fakeHistoryApi(page)
    await routeAthleteProfile(page)
    await page.goto(athleteProfilePath(athlete.id))

    await historyList(page)
      .getByRole('button', { name: /Cancelada/ })
      .click()

    await expect(
      page.getByText(/Solo se pueden revisar los entrenamientos finalizados/),
    ).toBeVisible()
    await expect(page.getByLabel('Observación')).toHaveCount(0)
  })
})

// la ficha del atleta del perfil: datos mínimos, sin registros de peso ni asignaciones
const routeAthleteProfile = async (page: Page) => {
  await page.route(ATHLETE_URL, (route) =>
    route.fulfill({
      status: 200,
      json: {
        id: athlete.id,
        coachId: coach.id,
        firstName: athlete.firstName,
        lastName: athlete.lastName,
        email: athlete.email,
        phone: null,
        status: 'ACTIVE',
        active: true,
        sex: null,
        experienceLevel: null,
        birthDate: null,
        heightCm: null,
        initialWeightKg: null,
        goal: null,
        injuries: null,
        limitations: null,
        availableDays: null,
        startDate: null,
        createdAt: '2026-10-31T20:05:12.345678Z',
      },
    }),
  )
  await page.route(WEIGHTS_URL, (route) =>
    route.fulfill({
      status: 200,
      json: { content: [], page: 0, size: 1, totalElements: 0, totalPages: 0 },
    }),
  )
  await page.route(ASSIGNMENTS_URL, (route) =>
    route.fulfill({
      status: 200,
      json: { content: [], page: 0, size: 10, totalElements: 0, totalPages: 0 },
    }),
  )
}
