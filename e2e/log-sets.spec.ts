import { expect, test, type Page, type Request } from '@playwright/test'
import { todayInAppTimeZone } from '../src/lib/iso-date.ts'
import { trainingPath } from '../src/router/paths.ts'
import {
  apiError,
  athlete,
  routeCurrentUser,
  seedSession,
} from './auth-helpers.ts'

const SESSION_ID = '4f5a6b7c-8d9e-4f0a-8b1c-2d3e4f5a6b7c'
const BENCH_ID = 'e1f2a3b4-c5d6-4e7f-8a9b-0c1d2e3f4a5b'
const ROW_ID = 'f2a3b4c5-d6e7-4f80-9b0c-1d2e3f4a5b6c'

const SESSION_URL = new RegExp(`/api/athletes/[^/]+/sessions/${SESSION_ID}$`)
const IN_PROGRESS_URL = /\/api\/athletes\/[^/]+\/sessions\/in-progress$/
const SET_URL = new RegExp(
  `/api/athletes/[^/]+/sessions/${SESSION_ID}/exercises/[^/]+/sets/\\d+$`,
)
const MUSCLE_GROUPS_URL = /\/api\/muscle-groups$/

// el día 1 de la rutina de prueba (contrato 10.3): press de banca a 4 series y remo a 3
const torso = {
  id: 'c3d4e5f6-0718-4293-a4b5-c6d7e8f90a1b',
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
      recommendedWeight: null,
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

type Status = 'IN_PROGRESS' | 'FINISHED'
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

// TrainingSessionResponse con las series registradas (contrato 11.4), iniciada hoy a las 19:15
const sessionJson = (status: Status, performedSets: RecordedSet[]) => ({
  id: SESSION_ID,
  status,
  sessionDate: todayInAppTimeZone(),
  startedAt: '2026-11-11T22:15:03.512345Z',
  assignmentId: '8b1e4c2d-5f6a-4b7c-9d8e-0f1a2b3c4d5e',
  routineId: '5a6b7c8d-9e0f-4a1b-8c2d-3e4f5a6b7c8d',
  routineName: 'Fuerza 2 días',
  day: torso,
  performedSets,
  // US-20: sin hora de fin mientras está en curso; el resumen cuenta las series del día (7 en total)
  endedAt: status === 'FINISHED' ? '2026-11-11T23:20:00Z' : null,
  summary: {
    prescribedSets: 7,
    doneSets: performedSets.filter((set) => set.status === 'DONE').length,
    skippedSets: performedSets.filter((set) => set.status === 'SKIPPED').length,
    pendingSets: 7 - performedSets.length,
    volumeKg: performedSets.reduce(
      (total, set) => total + (set.weight ?? 0) * (set.reps ?? 0),
      0,
    ),
  },
})

// backend de las series en memoria: cada PUT reemplaza la serie (contrato 11.2) y devuelve la
// sesión completa. dropNextResponse simula un corte: el servidor guarda, pero el cliente no lo ve
const fakeServer = async (page: Page) => {
  const state = {
    status: 'IN_PROGRESS' as Status,
    sets: [] as RecordedSet[],
    dropNextResponse: false,
  }
  const puts: Request[] = []

  await page.route(SESSION_URL, (route) => {
    if (route.request().method() !== 'GET') return route.fallback()
    return route.fulfill({
      status: 200,
      json: sessionJson(state.status, state.sets),
    })
  })

  await page.route(IN_PROGRESS_URL, (route) =>
    state.status === 'IN_PROGRESS'
      ? route.fulfill({
          status: 200,
          json: sessionJson(state.status, state.sets),
        })
      : route.fulfill({ status: 204 }),
  )

  await page.route(SET_URL, (route) => {
    const request = route.request()
    if (request.method() !== 'PUT') return route.fallback()
    puts.push(request)

    if (state.status !== 'IN_PROGRESS') {
      return route.fulfill(
        apiError(
          409,
          'Ya no podés cargar ni corregir series: el entrenamiento no está en curso',
          `/athletes/${athlete.id}/sessions/${SESSION_ID}`,
        ),
      )
    }

    // /api/athletes/{a}/sessions/{s}/exercises/{routineExerciseId}/sets/{setNumber}
    const parts = new URL(request.url()).pathname.split('/')
    const routineExerciseId = parts[parts.length - 3]
    const setNumber = Number(parts[parts.length - 1])
    const body = request.postDataJSON() as {
      status: 'DONE' | 'SKIPPED'
      weight?: number
      reps?: number
      rpe?: number
      skipReason?: string
    }
    const done = body.status === 'DONE'
    const record: RecordedSet = {
      id: `serie-${routineExerciseId}-${setNumber}`,
      routineExerciseId,
      setNumber,
      status: body.status,
      weight: done ? (body.weight ?? null) : null,
      reps: done ? (body.reps ?? null) : null,
      rpe: done ? (body.rpe ?? null) : null,
      skipReason: done ? null : (body.skipReason ?? null),
    }
    state.sets = [
      ...state.sets.filter(
        (set) =>
          !(
            set.routineExerciseId === routineExerciseId &&
            set.setNumber === setNumber
          ),
      ),
      record,
    ]

    if (state.dropNextResponse) {
      state.dropNextResponse = false
      return route.abort('connectionreset')
    }
    return route.fulfill({
      status: 200,
      json: sessionJson(state.status, state.sets),
    })
  })

  return { state, puts }
}

const setUpAthlete = async (page: Page) => {
  await seedSession(page, athlete, 'access-1')
  await routeCurrentUser(page, athlete)
  await page.route(MUSCLE_GROUPS_URL, (route) =>
    route.fulfill({ status: 200, json: muscleGroups }),
  )
}

const openTraining = async (page: Page) => {
  await page.goto(trainingPath(SESSION_ID))
  await expect(
    page.getByRole('heading', { name: 'Entrenamiento en curso', level: 1 }),
  ).toBeVisible()
}

// la fila de una serie del press de banca o del remo (grupo con nombre accesible)
const setRow = (page: Page, exercise: string, setNumber: number) =>
  page.getByRole('group', {
    name: `Serie ${setNumber} de ${exercise}`,
    exact: true,
  })

const seriesOf = (page: Page, exercise: string) =>
  page.getByRole('group', { name: `Series de ${exercise}`, exact: true })

const PATH_OF_SET = (setNumber: number) =>
  `/api/athletes/${athlete.id}/sessions/${SESSION_ID}/exercises/${BENCH_ID}/sets/${setNumber}`

test.describe('como atleta · registro de series en vivo (US-19)', () => {
  test.beforeEach(async ({ page }) => {
    await setUpAthlete(page)
  })

  test('completar una serie es un toque y queda hecha (CA-1, CA-2)', async ({
    page,
  }) => {
    const server = await fakeServer(page)
    await openTraining(page)
    const first = setRow(page, 'Press de banca', 1)
    // la fila viene precargada con lo planificado: 62,5 kg y 8 repeticiones
    await expect(
      first.getByRole('textbox', { name: 'Peso de la serie 1, en kilos' }),
    ).toHaveValue('62,5')
    await expect(
      first.getByRole('textbox', { name: 'Repeticiones de la serie 1' }),
    ).toHaveValue('8')

    let taps = 0
    await first.getByRole('button', { name: 'Completar la serie 1' }).click()
    taps += 1

    await expect(first.getByRole('status')).toHaveText('Hecha')
    // el criterio de US-19: completar una serie son como máximo 3 toques
    expect(taps).toBeLessThanOrEqual(3)
    expect(server.puts).toHaveLength(1)
    expect(new URL(server.puts[0].url()).pathname).toBe(PATH_OF_SET(1))
    expect(server.puts[0].postDataJSON()).toEqual({
      status: 'DONE',
      weight: 62.5,
      reps: 8,
    })
    expect(server.puts[0].headers().authorization).toBe('Bearer access-1')
    await expect(seriesOf(page, 'Press de banca')).toContainText(
      '1 de 4 hechas',
    )
  })

  test('corregir una serie ya cargada reemplaza lo registrado (CA-4)', async ({
    page,
  }) => {
    const server = await fakeServer(page)
    await openTraining(page)
    const first = setRow(page, 'Press de banca', 1)
    await first.getByRole('button', { name: 'Completar la serie 1' }).click()
    await expect(first.getByRole('status')).toHaveText('Hecha')

    await first
      .getByRole('textbox', { name: 'Repeticiones de la serie 1' })
      .fill('7')
    await first
      .getByRole('button', { name: 'Guardar la corrección de la serie 1' })
      .click()

    await expect(first.getByRole('status')).toHaveText('Hecha')
    expect(server.puts).toHaveLength(2)
    expect(server.puts[1].postDataJSON()).toEqual({
      status: 'DONE',
      weight: 62.5,
      reps: 7,
    })
    // sigue siendo una sola serie
    await expect(seriesOf(page, 'Press de banca')).toContainText(
      '1 de 4 hechas',
    )
  })

  test('omitir una serie con motivo (CA-3)', async ({ page }) => {
    const server = await fakeServer(page)
    await openTraining(page)
    const second = setRow(page, 'Press de banca', 2)

    await second.getByRole('button', { name: 'Detalles' }).click()
    await second.getByRole('button', { name: 'Omitir serie' }).click()
    await second
      .getByRole('textbox', { name: /Motivo de la omisión/ })
      .fill('Dolor de hombro')
    await second.getByRole('button', { name: 'Confirmar omisión' }).click()

    await expect(second.getByRole('status')).toHaveText(
      'Omitida: Dolor de hombro',
    )
    expect(server.puts).toHaveLength(1)
    expect(server.puts[0].postDataJSON()).toEqual({
      status: 'SKIPPED',
      skipReason: 'Dolor de hombro',
    })
  })

  test('si se corta la red, los datos siguen en pantalla y reintentar no duplica (CE-6)', async ({
    page,
  }) => {
    const server = await fakeServer(page)
    // el servidor guarda la serie, pero la respuesta no llega al navegador
    server.state.dropNextResponse = true
    await openTraining(page)
    const first = setRow(page, 'Press de banca', 1)

    await first.getByRole('button', { name: 'Completar la serie 1' }).click()

    await expect(first.getByRole('alert')).toContainText(
      'Lo que cargaste sigue en pantalla.',
    )
    await expect(
      first.getByRole('textbox', { name: 'Peso de la serie 1, en kilos' }),
    ).toHaveValue('62,5')

    await first.getByRole('button', { name: 'Reintentar' }).click()

    await expect(first.getByRole('status')).toHaveText('Hecha')
    await expect(first.getByRole('alert')).toHaveCount(0)
    // el reintento manda el mismo cuerpo a la misma URL
    expect(server.puts).toHaveLength(2)
    expect(server.puts[1].url()).toBe(server.puts[0].url())
    expect(server.puts[1].postDataJSON()).toEqual(server.puts[0].postDataJSON())
    // y el servidor tiene una sola serie 1 del press de banca
    expect(
      server.state.sets.filter(
        (set) => set.routineExerciseId === BENCH_ID && set.setNumber === 1,
      ),
    ).toHaveLength(1)
    await expect(seriesOf(page, 'Press de banca')).toContainText(
      '1 de 4 hechas',
    )
  })

  test('si la sesión ya terminó (409) avisa y no deja cargar más (CE-2)', async ({
    page,
  }) => {
    const server = await fakeServer(page)
    await openTraining(page)
    // otro dispositivo la finalizó mientras la pantalla estaba abierta
    server.state.status = 'FINISHED'

    await setRow(page, 'Press de banca', 1)
      .getByRole('button', { name: 'Completar la serie 1' })
      .click()

    // el aviso queda en la pantalla: la fila pasa a solo lectura al volver a pedir la sesión
    await expect(
      page.getByRole('heading', { name: 'Entrenamiento finalizado', level: 1 }),
    ).toBeVisible()
    await expect(
      page.getByRole('note').filter({
        hasText:
          'Ya no podés cargar ni corregir series: el entrenamiento no está en curso.',
      }),
    ).toBeVisible()
    await expect(
      page.getByRole('button', { name: /Completar la serie/ }),
    ).toHaveCount(0)
    expect(server.puts).toHaveLength(1)
  })

  test('una sesión finalizada muestra lo registrado sin controles', async ({
    page,
  }) => {
    const server = await fakeServer(page)
    server.state.status = 'FINISHED'
    server.state.sets = [
      {
        id: 'serie-omitida',
        routineExerciseId: BENCH_ID,
        setNumber: 2,
        status: 'SKIPPED',
        weight: null,
        reps: null,
        rpe: null,
        skipReason: 'Dolor de hombro',
      },
    ]

    await page.goto(trainingPath(SESSION_ID))

    await expect(
      page.getByRole('heading', { name: 'Entrenamiento finalizado', level: 1 }),
    ).toBeVisible()
    await expect(seriesOf(page, 'Press de banca')).toContainText(
      'Omitida: Dolor de hombro',
    )
    await expect(
      page.getByRole('button', { name: /Completar la serie/ }),
    ).toHaveCount(0)
    expect(server.puts).toHaveLength(0)
  })
})

test.describe('en móvil', () => {
  test.use({ viewport: { width: 375, height: 740 } })

  test.beforeEach(async ({ page }) => {
    await setUpAthlete(page)
  })

  test('registra la serie en el teléfono sin scroll horizontal', async ({
    page,
  }) => {
    await fakeServer(page)
    await openTraining(page)

    // expresión como string: los E2E no tipan el DOM del navegador
    const overflows = () =>
      page.evaluate(
        'document.documentElement.scrollWidth > document.documentElement.clientWidth',
      )

    const complete = setRow(page, 'Press de banca', 1).getByRole('button', {
      name: 'Completar la serie 1',
    })
    await expect(complete).toBeInViewport()
    expect(await overflows()).toBe(false)

    await complete.click()

    await expect(
      setRow(page, 'Press de banca', 1).getByRole('status'),
    ).toHaveText('Hecha')
    expect(await overflows()).toBe(false)
  })
})
