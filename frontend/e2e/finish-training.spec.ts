import {
  expect,
  test,
  type Page,
  type Request,
  type Route,
} from '@playwright/test'
import { todayInAppTimeZone } from '../src/lib/iso-date.ts'
import { trainingPath } from '../src/router/paths.ts'
import {
  apiError,
  athlete,
  routeCurrentUser,
  seedSession,
} from './auth-helpers.ts'

// US-20: finalizar o cancelar el entrenamiento en curso. La API va interceptada: el estado de la
// sesión vive en un objeto y cada pedido responde desde ahí, como el backend (contrato 10.2, 10.4)

const ROUTINE_URL = /\/api\/athletes\/[^/]+\/routine$/
const MUSCLE_GROUPS_URL = /\/api\/muscle-groups$/
const IN_PROGRESS_URL = /\/api\/athletes\/[^/]+\/sessions\/in-progress$/
const SESSION_ID = '4f5a6b7c-8d9e-4f0a-8b1c-2d3e4f5a6b7c'
const SESSION_URL = new RegExp(`/api/athletes/[^/]+/sessions/${SESSION_ID}$`)
const END_URL = new RegExp(
  `/api/athletes/[^/]+/sessions/${SESSION_ID}/(finish|cancel)$`,
)

const TORSO_ID = 'c3d4e5f6-0718-4293-a4b5-c6d7e8f90a1b'
const BENCH_ID = 'e1f2a3b4-c5d6-4e7f-8a9b-0c1d2e3f4a5b'
const ROW_ID = 'f2a3b4c5-d6e7-4f80-9b0c-1d2e3f4a5b6c'

// el día de prueba: 4 series de press y 3 de remo, 7 en total
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

const muscleGroups = [
  { code: 'CHEST', name: 'Pecho', region: 'UPPER' },
  { code: 'BACK', name: 'Espalda', region: 'UPPER' },
]

type Status = 'IN_PROGRESS' | 'FINISHED' | 'CANCELLED'
type RecordedSet = {
  id: string
  routineExerciseId: string
  setNumber: number
  status: 'DONE' | 'SKIPPED'
  weight: number | null
  reps: number | null
  rpe: number | null
  skipReason: string | null
}

// la sesión empezó hoy a las 19:15 (zona de la app). Lo que se cierra, a las 20:20 de hoy
const today = () => todayInAppTimeZone()
const START = `${today()}T19:15:00-03:00`
const END = `${today()}T20:20:00-03:00`

// el resumen como lo calcula el backend (contrato de US-20): prescritas, hechas, omitidas,
// pendientes y volumen de las hechas
const summaryOf = (performedSets: RecordedSet[]) => {
  const done = performedSets.filter((set) => set.status === 'DONE')
  return {
    prescribedSets: 7,
    doneSets: done.length,
    skippedSets: performedSets.filter((set) => set.status === 'SKIPPED').length,
    pendingSets: 7 - performedSets.length,
    volumeKg: done.reduce(
      (total, set) => total + (set.weight ?? 0) * (set.reps ?? 0),
      0,
    ),
  }
}

// TrainingSessionResponse (contrato de API, 10.2 y US-20)
const sessionJson = (state: SessionState) => ({
  id: SESSION_ID,
  status: state.status,
  sessionDate: today(),
  startedAt: START,
  assignmentId: '8b1e4c2d-5f6a-4b7c-9d8e-0f1a2b3c4d5e',
  routineId: '5a6b7c8d-9e0f-4a1b-8c2d-3e4f5a6b7c8d',
  routineName: 'Fuerza 2 días',
  day: torso,
  performedSets: state.performedSets,
  endedAt: state.endedAt,
  summary: summaryOf(state.performedSets),
})

type SessionState = {
  status: Status
  endedAt: string | null
  performedSets: RecordedSet[]
}

// el backend simulado: `conflict` cierra la sesión en otro lado antes de responder (409) y
// `serverError` responde 500 sin cambiar nada
type EndBehavior = 'ok' | 'conflict' | 'serverError'

const doneSet = (
  routineExerciseId: string,
  setNumber: number,
  weight: number,
  reps: number,
): RecordedSet => ({
  id: `${routineExerciseId}-${setNumber}`,
  routineExerciseId,
  setNumber,
  status: 'DONE',
  weight,
  reps,
  rpe: null,
  skipReason: null,
})

const fakeSessionApi = async (
  page: Page,
  initial: Partial<SessionState> & { onEnd?: EndBehavior } = {},
) => {
  const state: SessionState = {
    status: initial.status ?? 'IN_PROGRESS',
    endedAt: initial.endedAt ?? null,
    performedSets: initial.performedSets ?? [],
  }
  const ends: Request[] = []
  const onEnd = initial.onEnd ?? 'ok'

  await page.route(ROUTINE_URL, (route) =>
    route.fulfill({
      status: 200,
      json: {
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
          days: [torso],
        },
      },
    }),
  )
  await page.route(MUSCLE_GROUPS_URL, (route) =>
    route.fulfill({ status: 200, json: muscleGroups }),
  )
  await page.route(IN_PROGRESS_URL, (route) =>
    state.status === 'IN_PROGRESS'
      ? route.fulfill({ status: 200, json: sessionJson(state) })
      : route.fulfill({ status: 204 }),
  )
  await page.route(SESSION_URL, (route: Route) => {
    if (route.request().method() !== 'GET') return route.fallback()
    return route.fulfill({ status: 200, json: sessionJson(state) })
  })
  await page.route(END_URL, (route) => {
    if (route.request().method() !== 'POST') return route.fallback()
    ends.push(route.request())
    const isFinish = route.request().url().endsWith('/finish')
    const path = `/athletes/${athlete.id}/sessions/${SESSION_ID}`

    if (onEnd === 'serverError') {
      return route.fulfill(
        apiError(
          500,
          'Ocurrió un error inesperado. Intente nuevamente más tarde',
          path,
        ),
      )
    }
    if (state.status !== 'IN_PROGRESS' || onEnd === 'conflict') {
      // otro dispositivo la cerró mientras la pantalla estaba abierta
      state.status = 'FINISHED'
      state.endedAt = END
      return route.fulfill(
        apiError(
          409,
          // texto de finalizar o cancelar ya cerrada (contrato 14.6), distinto del de las series
          'La sesión de entrenamiento ya no está en curso: está finalizada o cancelada',
          path,
        ),
      )
    }
    state.status = isFinish ? 'FINISHED' : 'CANCELLED'
    state.endedAt = END
    return route.fulfill({ status: 200, json: sessionJson(state) })
  })

  return { ends }
}

const openTraining = async (page: Page) => {
  await seedSession(page, athlete, 'access-1')
  await routeCurrentUser(page, athlete)
  await page.goto(trainingPath(SESSION_ID))
}

const heading = (page: Page, name: string) =>
  page.getByRole('heading', { name, level: 1 })

const resumen = (page: Page) => page.getByRole('region', { name: 'Resumen' })

// la confirmación de la acción (modal): el botón de confirmar es el de su texto
const confirmDialog = (page: Page, title: string) =>
  page.getByRole('dialog', { name: title })

test.describe('como atleta · finalizar o cancelar (US-20)', () => {
  test('finaliza con series hechas y ve el resumen (CA-1)', async ({
    page,
  }) => {
    const { ends } = await fakeSessionApi(page, {
      performedSets: [
        doneSet(BENCH_ID, 1, 62.5, 8),
        doneSet(BENCH_ID, 2, 62.5, 8),
        {
          id: 'omitida',
          routineExerciseId: BENCH_ID,
          setNumber: 3,
          status: 'SKIPPED',
          weight: null,
          reps: null,
          rpe: null,
          skipReason: 'Dolor de hombro',
        },
        doneSet(ROW_ID, 1, 40, 10),
      ],
    })
    await openTraining(page)

    await expect(heading(page, 'Entrenamiento en curso')).toBeVisible()
    await expect(page.getByText('Llevás 3 de 7 series hechas.')).toBeVisible()
    await page.getByRole('button', { name: 'Finalizar entrenamiento' }).click()

    const dialog = confirmDialog(page, '¿Finalizar el entrenamiento?')
    await expect(dialog).toContainText(
      'Se guardan 3 series hechas y el entrenamiento queda cerrado.',
    )
    await expect(dialog).toContainText('Quedan 3 series sin registrar')
    await dialog.getByRole('button', { name: 'Sí, finalizar' }).click()

    await expect(heading(page, 'Entrenamiento finalizado')).toBeVisible()
    await expect(page.getByText('Terminaste a las 20:20')).toBeVisible()
    await expect(resumen(page)).toContainText('3 de 7')
    await expect(resumen(page)).toContainText('1.400 kg')
    await expect(resumen(page)).toContainText('1 h 5 min')
    // sin botones de acción: la sesión ya cerró
    await expect(
      page.getByRole('button', { name: 'Finalizar entrenamiento' }),
    ).toHaveCount(0)

    expect(ends).toHaveLength(1)
    expect(new URL(ends[0].url()).pathname).toBe(
      `/api/athletes/${athlete.id}/sessions/${SESSION_ID}/finish`,
    )
    expect(ends[0].method()).toBe('POST')
    expect(ends[0].headers().authorization).toBe('Bearer access-1')
    expect(ends[0].postData()).toBeFalsy()
  })

  test('cancela y vuelve a Mi rutina, donde ya se puede iniciar otro (CA-2)', async ({
    page,
  }) => {
    const { ends } = await fakeSessionApi(page)
    await openTraining(page)

    await page.getByRole('button', { name: 'Cancelar entrenamiento' }).click()
    await confirmDialog(page, '¿Cancelar el entrenamiento?')
      .getByRole('button', { name: 'Sí, cancelar' })
      .click()

    await expect(heading(page, 'Entrenamiento cancelado')).toBeVisible()
    await expect(page.getByText('Cancelaste a las 20:20')).toBeVisible()
    await expect(resumen(page)).toHaveCount(0)
    await expect(page.getByRole('note')).toContainText(
      'Ya no podés cargar ni corregir series',
    )
    expect(ends).toHaveLength(1)
    expect(new URL(ends[0].url()).pathname).toMatch(/\/cancel$/)

    await page.getByRole('link', { name: 'Volver a Mi rutina' }).click()

    await expect(heading(page, 'Mi rutina')).toBeVisible()
    await expect(
      page
        .getByRole('tabpanel')
        .getByRole('button', { name: 'Iniciar entrenamiento' }),
    ).toBeVisible()
    await expect(
      page.getByRole('region', { name: 'Tenés un entrenamiento en curso' }),
    ).toHaveCount(0)
  })

  test('sin ninguna serie hecha, finalizar avisa y se cancela en su lugar (CE-2)', async ({
    page,
  }) => {
    const { ends } = await fakeSessionApi(page)
    await openTraining(page)

    await page.getByRole('button', { name: 'Finalizar entrenamiento' }).click()

    const dialog = confirmDialog(page, 'Todavía no hiciste ninguna serie')
    await expect(dialog).toContainText('Te conviene cancelarlo')
    await dialog.getByRole('button', { name: 'Cancelarlo en su lugar' }).click()

    await confirmDialog(page, '¿Cancelar el entrenamiento?')
      .getByRole('button', { name: 'Sí, cancelar' })
      .click()

    await expect(heading(page, 'Entrenamiento cancelado')).toBeVisible()
    // nunca se llamó a finalizar
    expect(ends.map((request) => request.url())).toEqual([
      expect.stringMatching(new RegExp(`/${SESSION_ID}/cancel$`)),
    ])
  })

  test('cancelar la confirmación no cierra la sesión', async ({ page }) => {
    const { ends } = await fakeSessionApi(page, {
      performedSets: [doneSet(BENCH_ID, 1, 62.5, 8)],
    })
    await openTraining(page)

    await page.getByRole('button', { name: 'Finalizar entrenamiento' }).click()
    await confirmDialog(page, '¿Finalizar el entrenamiento?')
      .getByRole('button', { name: 'Cancelar', exact: true })
      .click()

    await expect(
      page.getByRole('dialog', { name: '¿Finalizar el entrenamiento?' }),
    ).toHaveCount(0)
    await expect(heading(page, 'Entrenamiento en curso')).toBeVisible()
    await expect(
      page.getByRole('button', { name: 'Finalizar entrenamiento' }),
    ).toBeEnabled()
    expect(ends).toHaveLength(0)
  })

  test('si ya la cerraron en otro lado (409), muestra el estado real', async ({
    page,
  }) => {
    await fakeSessionApi(page, {
      onEnd: 'conflict',
      performedSets: [doneSet(BENCH_ID, 1, 62.5, 8)],
    })
    await openTraining(page)

    await page.getByRole('button', { name: 'Finalizar entrenamiento' }).click()
    await confirmDialog(page, '¿Finalizar el entrenamiento?')
      .getByRole('button', { name: 'Sí, finalizar' })
      .click()

    await expect(heading(page, 'Entrenamiento finalizado')).toBeVisible()
    await expect(page.getByRole('note')).toContainText(
      'Ya no podés cargar ni corregir series',
    )
    await expect(
      page.getByRole('button', { name: 'Finalizar entrenamiento' }),
    ).toHaveCount(0)
  })

  test('un error del servidor avisa, cierra la confirmación y deja reintentar', async ({
    page,
  }) => {
    await fakeSessionApi(page, {
      onEnd: 'serverError',
      performedSets: [doneSet(BENCH_ID, 1, 62.5, 8)],
    })
    await openTraining(page)

    await page.getByRole('button', { name: 'Finalizar entrenamiento' }).click()
    await confirmDialog(page, '¿Finalizar el entrenamiento?')
      .getByRole('button', { name: 'Sí, finalizar' })
      .click()

    await expect(page.getByRole('alert')).toContainText(
      'Ocurrió un error inesperado',
    )
    await expect(heading(page, 'Entrenamiento en curso')).toBeVisible()
    await expect(
      page.getByRole('button', { name: 'Finalizar entrenamiento' }),
    ).toBeEnabled()
  })

  test('abrir el detalle de una sesión finalizada muestra el resumen sin acciones', async ({
    page,
  }) => {
    await fakeSessionApi(page, {
      status: 'FINISHED',
      endedAt: END,
      performedSets: [doneSet(BENCH_ID, 1, 62.5, 8)],
    })
    await openTraining(page)

    await expect(heading(page, 'Entrenamiento finalizado')).toBeVisible()
    await expect(resumen(page)).toContainText('1 de 7')
    await expect(resumen(page)).toContainText('500 kg')
    await expect(page).toHaveURL(trainingPath(SESSION_ID))
    // sin acciones en el contenido (el shell de la app tiene sus propios botones)
    await expect(page.getByRole('main').getByRole('button')).toHaveCount(0)
  })
})
