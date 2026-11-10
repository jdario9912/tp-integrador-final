import { expect, test, type Page, type Request } from '@playwright/test'
import {
  routineDetailPath,
  routineEditPath,
  routineStructurePath,
} from '../src/router/paths.ts'
import {
  apiError,
  coach,
  routeCurrentUser,
  seedSession,
} from './auth-helpers.ts'

const MUSCLE_GROUPS_URL = /\/api\/muscle-groups$/
const EXERCISES_URL = /\/api\/exercises(\?.*)?$/
const ROUTINES_URL = /\/api\/routines(\?.*)?$/
// detalle y edición (GET, PUT), estructura (PUT /days) y duplicado (POST /duplicate)
const ROUTINE_URL = /\/api\/routines\/[^/?]+(\/days|\/duplicate)?$/

const muscleGroups = [
  { code: 'CHEST', name: 'Pecho', region: 'UPPER' },
  { code: 'BACK', name: 'Espalda', region: 'UPPER' },
  { code: 'TRICEPS', name: 'Tríceps', region: 'UPPER' },
  { code: 'QUADRICEPS', name: 'Cuádriceps', region: 'LOWER' },
]

const catalog = [
  { id: 'ex-bench', name: 'Press de banca', muscleGroup: 'CHEST' },
  { id: 'ex-dips', name: 'Fondos', muscleGroup: 'TRICEPS' },
  { id: 'ex-row', name: 'Remo con barra', muscleGroup: 'BACK' },
  { id: 'ex-squat', name: 'Sentadilla', muscleGroup: 'QUADRICEPS' },
].map((exercise) => ({
  ...exercise,
  description: null,
  videoUrl: null,
  global: true,
}))

type ExerciseJson = {
  id: string
  exerciseId: string
  exerciseName: string
  muscleGroup: string
  sortOrder: number
  sets: number
  reps: number
  recommendedWeight: number | null
  rest: number | null
  rirRpe: string | null
  techniqueNote: string | null
}

type DayJson = {
  id: string
  dayNumber: number
  name: string
  exercises: ExerciseJson[]
}

type RoutineJson = {
  id: string
  name: string
  description: string | null
  goal: string | null
  daysPerWeek: number | null
  durationWeeks: number | null
  isTemplate: boolean
  createdAt: string
  days: DayJson[]
  // solo del mock: dueño de la rutina
  coachId: string
}

type ExerciseBody = Omit<
  ExerciseJson,
  'id' | 'exerciseName' | 'muscleGroup' | 'sortOrder'
> & { id?: string }
type DayBody = { id?: string; name: string; exercises: ExerciseBody[] }

const uuid = (prefix: number, n: number) =>
  `00000000-0000-4000-${prefix}000-${String(n).padStart(12, '0')}`

const exerciseJson = (
  id: string,
  exerciseId: string,
  overrides: Partial<ExerciseJson> = {},
): ExerciseJson => {
  const { name, muscleGroup } = catalog.find((e) => e.id === exerciseId)!
  return {
    id,
    exerciseId,
    exerciseName: name,
    muscleGroup,
    sortOrder: 0,
    sets: 4,
    reps: 10,
    recommendedWeight: null,
    rest: null,
    rirRpe: null,
    techniqueNote: null,
    ...overrides,
  }
}

const volume = (): RoutineJson => ({
  id: uuid(9, 1),
  name: 'Fase de volumen',
  description: null,
  goal: 'Hipertrofia',
  daysPerWeek: 3,
  durationWeeks: 8,
  isTemplate: false,
  createdAt: '2026-11-05T12:00:00Z',
  coachId: coach.id,
  days: [
    {
      id: 'day-push',
      dayNumber: 1,
      name: 'Empuje',
      exercises: [
        exerciseJson('re-bench', 'ex-bench', {
          recommendedWeight: 80,
          rest: 120,
          rirRpe: 'RIR 2',
        }),
        exerciseJson('re-dips', 'ex-dips', { sortOrder: 1, sets: 3, reps: 12 }),
      ],
    },
    { id: 'day-legs', dayNumber: 2, name: 'Piernas', exercises: [] },
  ],
})

const emptyRoutine = (): RoutineJson => ({
  ...volume(),
  id: uuid(9, 2),
  name: 'Fuerza 5x5',
  goal: null,
  days: [],
})

const foreign = (): RoutineJson => ({
  ...volume(),
  id: uuid(9, 3),
  name: 'Rutina ajena',
  coachId: 'otro-entrenador',
})

// lo que devuelve la API: sin los campos internos del mock
const toResponse = ({ coachId: _coachId, ...rest }: RoutineJson) => rest

// imita al backend de US-14/US-15 en memoria. `withSets`: ejercicios con series registradas,
// quitarlos responde 422
const routeBackend = async (page: Page, { withSets = [] as string[] } = {}) => {
  let routines = [volume(), emptyRoutine(), foreign()]
  let nextId = 100
  const requests: Request[] = []

  await page.route(MUSCLE_GROUPS_URL, (route) =>
    route.fulfill({ status: 200, json: muscleGroups }),
  )

  await page.route(EXERCISES_URL, (route) => {
    const params = new URL(route.request().url()).searchParams
    const name = params.get('name')?.toLowerCase() ?? ''
    const content = catalog.filter((e) => e.name.toLowerCase().includes(name))
    return route.fulfill({
      status: 200,
      json: {
        content,
        page: 0,
        size: 20,
        totalElements: content.length,
        totalPages: 1,
      },
    })
  })

  await page.route(ROUTINES_URL, (route) => {
    const mine = routines.filter((r) => r.coachId === coach.id)
    return route.fulfill({
      status: 200,
      json: {
        content: mine.map(toResponse),
        page: 0,
        size: 20,
        totalElements: mine.length,
        totalPages: 1,
      },
    })
  })

  const replaceStructure = (routine: RoutineJson, days: DayBody[]) => {
    const previous = routine.days.flatMap((d) => d.exercises.map((e) => e.id))
    const kept = days.flatMap((d) => d.exercises.flatMap((e) => e.id ?? []))
    const removed = previous.find(
      (id) => withSets.includes(id) && !kept.includes(id),
    )
    if (removed) return removed
    routine.days = days.map((day, dayIndex) => ({
      id: day.id ?? `day-${nextId++}`,
      dayNumber: dayIndex + 1,
      name: day.name,
      exercises: day.exercises.map(({ id, ...exercise }, sortOrder) => ({
        ...exerciseJson(id ?? `re-${nextId++}`, exercise.exerciseId),
        ...exercise,
        sortOrder,
      })),
    }))
    return undefined
  }

  await page.route(ROUTINE_URL, (route) => {
    const request = route.request()
    requests.push(request)
    const path = new URL(request.url()).pathname.replace('/api', '')
    const [, , id, action] = path.split('/')
    const routine = routines.find((r) => r.id === id)
    if (!routine) {
      return route.fulfill(
        apiError(404, `No existe la rutina con id ${id}`, path),
      )
    }
    if (routine.coachId !== coach.id) {
      return route.fulfill(
        apiError(403, 'No tiene permisos para acceder a esta rutina', path),
      )
    }

    if (action === 'duplicate') {
      const copy: RoutineJson = {
        ...structuredClone(routine),
        id: uuid(9, nextId++),
        name: `Copia de ${routine.name}`,
      }
      routines = [...routines, copy]
      return route.fulfill({ status: 201, json: toResponse(copy) })
    }

    if (action === 'days') {
      const removed = replaceStructure(routine, request.postDataJSON().days)
      return removed
        ? route.fulfill(
            apiError(
              422,
              'No se puede quitar un ejercicio que ya tiene series registradas. Duplicá la rutina y editá la copia.',
              path,
            ),
          )
        : route.fulfill({ status: 200, json: toResponse(routine) })
    }

    if (request.method() === 'PUT') {
      const body = request.postDataJSON()
      const taken = routines.some(
        (r) =>
          r.id !== id &&
          r.coachId === coach.id &&
          r.name.toLowerCase() === body.name.toLowerCase(),
      )
      if (taken) {
        return route.fulfill(
          apiError(409, `Ya tiene una rutina llamada ${body.name}`, path),
        )
      }
      Object.assign(routine, body)
      return route.fulfill({ status: 200, json: toResponse(routine) })
    }

    return route.fulfill({ status: 200, json: toResponse(routine) })
  })

  const structureBodies = () =>
    requests
      .filter((r) => r.url().endsWith('/days'))
      .map((r) => r.postDataJSON())

  return { requests, structureBodies }
}

// por texto: el skeleton de la página también es un status
const notice = (page: Page, text: string) =>
  page.getByRole('status').filter({ hasText: text })

const day = (page: Page, number: number) =>
  page.getByRole('region', { name: `Día ${number}`, exact: true })

const exerciseItem = (page: Page, name: string) =>
  page.getByRole('listitem', { name, exact: true })

// la URL cambia antes de que React muestre la página nueva: se espera el título
const openStructure = async (page: Page, id: string, title: string) => {
  await page.goto(routineStructurePath(id))
  await expect(
    page.getByRole('heading', { name: title, level: 1 }),
  ).toBeVisible()
}

test.describe('como entrenador', () => {
  test.beforeEach(async ({ page }) => {
    await seedSession(page, coach, 'access-1')
    await routeCurrentUser(page, coach)
  })

  test('configura los días y ejercicios de una rutina vacía', async ({
    page,
  }) => {
    const { structureBodies } = await routeBackend(page)
    const routine = emptyRoutine()
    await page.goto(routineDetailPath(routine.id))

    await expect(page.getByText('Todavía no cargaste los días')).toBeVisible()
    await page.getByRole('button', { name: 'Configurar estructura' }).click()
    await expect(page).toHaveURL(routineStructurePath(routine.id))
    await expect(
      page.getByText('La rutina todavía no tiene días'),
    ).toBeVisible()

    // el día nuevo enfoca su nombre con el texto seleccionado: se escribe encima
    await page.getByRole('button', { name: 'Agregar día' }).click()
    await expect(day(page, 1).getByLabel('Nombre del día')).toBeFocused()
    await page.keyboard.type('Pierna')

    await day(page, 1)
      .getByRole('button', { name: 'Agregar ejercicio al día 1' })
      .click()
    // el buscador se abre con el foco: Enter agrega el primer resultado
    await page.keyboard.type('sentad')
    await expect(
      page.getByRole('list', { name: 'Resultados' }).getByRole('button'),
    ).toHaveCount(1)
    await expect(
      page.getByRole('button', { name: 'Agregar Sentadilla' }),
    ).toBeVisible()
    await page.keyboard.press('Enter')
    await page.getByRole('searchbox', { name: 'Buscar ejercicio' }).fill('remo')
    await page.getByRole('button', { name: 'Agregar Remo con barra' }).click()
    await page.keyboard.press('Escape')

    const squat = exerciseItem(page, 'Sentadilla')
    await expect(squat).toContainText('Cuádriceps')
    await squat.getByLabel('Series').fill('5')
    await squat.getByLabel('Repeticiones').fill('5')
    await squat.getByLabel('Peso').fill('100')
    await squat.getByLabel('Descanso').fill('180')
    await squat.getByLabel('RIR/RPE').fill('rpe 8.5')
    await squat.getByLabel('Nota técnica').fill('Romper el paralelo')

    const row = exerciseItem(page, 'Remo con barra')
    await row.getByLabel('Series').fill('4')
    await row.getByLabel('Repeticiones').fill('10')
    await page.getByRole('button', { name: 'Subir Remo con barra' }).click()

    await page.getByRole('button', { name: 'Guardar estructura' }).click()

    await expect(page).toHaveURL(routineDetailPath(routine.id))
    await expect(
      notice(page, 'Guardaste la estructura de Fuerza 5x5.'),
    ).toBeVisible()
    expect(structureBodies()).toEqual([
      {
        days: [
          {
            name: 'Pierna',
            exercises: [
              {
                exerciseId: 'ex-row',
                sets: 4,
                reps: 10,
                recommendedWeight: null,
                rest: null,
                rirRpe: null,
                techniqueNote: null,
              },
              {
                exerciseId: 'ex-squat',
                sets: 5,
                reps: 5,
                recommendedWeight: 100,
                rest: 180,
                rirRpe: 'RPE 8.5',
                techniqueNote: 'Romper el paralelo',
              },
            ],
          },
        ],
      },
    ])

    const legDay = page.getByRole('listitem', { name: 'Día 1: Pierna' })
    await expect(legDay.getByRole('listitem')).toHaveCount(2)
    await expect(legDay.getByRole('listitem').first()).toContainText(
      'Remo con barra',
    )
    await expect(legDay).toContainText(
      '5 × 5 · 100 kg · Descanso 3 min · RPE 8.5',
    )
    await expect(legDay).toContainText('Romper el paralelo')
  })

  test('reordena, quita y edita la estructura existente conservando los ids', async ({
    page,
  }) => {
    const { structureBodies } = await routeBackend(page)
    await openStructure(page, volume().id, 'Fase de volumen')

    const bench = exerciseItem(page, 'Press de banca')
    await expect(bench.getByLabel('Peso')).toHaveValue('80')
    await expect(bench.getByLabel('RIR/RPE')).toHaveValue('RIR 2')

    await page.getByRole('button', { name: 'Bajar día 1' }).click()
    await expect(day(page, 1).getByLabel('Nombre del día')).toHaveValue(
      'Piernas',
    )
    await page.getByRole('button', { name: 'Quitar Fondos' }).click()
    await bench.getByLabel('Series').fill('5')
    await day(page, 2).getByLabel('Nombre del día').fill('Empuje pesado')

    await page.getByRole('button', { name: 'Guardar estructura' }).click()

    await expect(
      notice(page, 'Guardaste la estructura de Fase de volumen.'),
    ).toBeVisible()
    expect(structureBodies()).toEqual([
      {
        days: [
          { id: 'day-legs', name: 'Piernas', exercises: [] },
          {
            id: 'day-push',
            name: 'Empuje pesado',
            exercises: [
              {
                id: 're-bench',
                exerciseId: 'ex-bench',
                sets: 5,
                reps: 10,
                recommendedWeight: 80,
                rest: 120,
                rirRpe: 'RIR 2',
                techniqueNote: null,
              },
            ],
          },
        ],
      },
    ])
    await expect(
      page.getByRole('listitem', { name: 'Día 2: Empuje pesado' }),
    ).toContainText('5 × 10 · 80 kg · Descanso 2 min · RIR 2')
  })

  test('valida los campos antes de guardar', async ({ page }) => {
    const { structureBodies } = await routeBackend(page)
    await openStructure(page, volume().id, 'Fase de volumen')

    const bench = exerciseItem(page, 'Press de banca')
    await bench.getByLabel('Series').fill('0')
    await bench.getByLabel('RIR/RPE').fill('RIR 12')
    await day(page, 2).getByLabel('Nombre del día').fill('')
    await page.getByRole('button', { name: 'Guardar estructura' }).click()

    await expect(
      bench.getByText('Las series deben estar entre 1 y 99'),
    ).toBeVisible()
    await expect(
      bench.getByText('Usá el formato RIR n (0 a 10) o RPE n (1 a 10)'),
    ).toBeVisible()
    await expect(
      day(page, 2).getByText('El nombre del día es obligatorio'),
    ).toBeVisible()
    await expect(page.getByRole('alert')).toContainText(
      'Revisá los campos marcados.',
    )
    await expect(page).toHaveURL(routineStructurePath(volume().id))
    expect(structureBodies()).toEqual([])
  })

  test('si quita un ejercicio con series registradas ofrece duplicar la rutina', async ({
    page,
  }) => {
    await routeBackend(page, { withSets: ['re-bench'] })
    await openStructure(page, volume().id, 'Fase de volumen')

    await page.getByRole('button', { name: 'Quitar Press de banca' }).click()
    await page.getByRole('button', { name: 'Guardar estructura' }).click()

    const alert = page.getByRole('alert')
    await expect(alert).toContainText(
      'No se puede quitar un ejercicio que ya tiene series registradas.',
    )
    await alert.getByRole('button', { name: 'Duplicar rutina' }).click()

    await expect(
      page.getByRole('heading', { name: 'Copia de Fase de volumen', level: 1 }),
    ).toBeVisible()
    await expect(
      notice(page, 'Creaste Copia de Fase de volumen.'),
    ).toBeVisible()
    // la copia conserva la estructura original
    await expect(
      page.getByRole('listitem', { name: 'Día 1: Empuje' }),
    ).toContainText('Press de banca')
  })

  test('duplica una rutina desde el detalle y navega a la copia', async ({
    page,
  }) => {
    const { requests } = await routeBackend(page)
    await page.goto(routineDetailPath(volume().id))

    await page.getByRole('button', { name: 'Duplicar' }).click()

    await expect(
      page.getByRole('heading', { name: 'Copia de Fase de volumen', level: 1 }),
    ).toBeVisible()
    await expect(page).not.toHaveURL(routineDetailPath(volume().id))
    await expect(
      notice(page, 'Creaste Copia de Fase de volumen.'),
    ).toBeVisible()
    await expect(
      page.getByRole('listitem', { name: 'Día 1: Empuje' }),
    ).toContainText('Fondos')
    expect(
      requests
        .filter((r) => r.url().endsWith('/duplicate'))
        .map((r) => r.method()),
    ).toEqual(['POST'])
  })

  test('edita los datos de la rutina', async ({ page }) => {
    const { requests } = await routeBackend(page)
    await page.goto(routineDetailPath(volume().id))

    await page.getByRole('button', { name: 'Editar' }).click()
    await expect(page).toHaveURL(routineEditPath(volume().id))
    await expect(page.getByLabel('Nombre')).toHaveValue('Fase de volumen')

    // repetido con otra rutina propia (sin distinguir mayúsculas): se marca en el campo
    await page.getByLabel('Nombre').fill('FUERZA 5X5')
    await page.getByRole('button', { name: 'Guardar cambios' }).click()
    await expect(
      page.getByText('Ya tiene una rutina llamada FUERZA 5X5'),
    ).toBeVisible()
    await expect(page.getByLabel('Nombre')).toHaveAttribute(
      'aria-invalid',
      'true',
    )

    await page.getByLabel('Nombre').fill('Fase de volumen II')
    await page.getByLabel('Objetivo').fill('')
    await page.getByLabel('Días por semana').fill('4')
    await page.getByRole('button', { name: 'Guardar cambios' }).click()

    await expect(
      page.getByRole('heading', { name: 'Fase de volumen II', level: 1 }),
    ).toBeVisible()
    await expect(
      notice(page, 'Guardaste los cambios de Fase de volumen II.'),
    ).toBeVisible()
    await expect(page.getByText('4 días por semana')).toBeVisible()
    await expect(page.getByText('Sin objetivo')).toBeVisible()
    expect(
      requests
        .filter((r) => r.method() === 'PUT')
        .map((r) => r.postDataJSON())
        .at(-1),
    ).toEqual({
      name: 'Fase de volumen II',
      description: null,
      goal: null,
      daysPerWeek: 4,
      durationWeeks: 8,
      isTemplate: false,
    })
  })

  test('la estructura de una rutina de otro entrenador muestra el aviso', async ({
    page,
  }) => {
    await routeBackend(page)

    await page.goto(routineStructurePath(foreign().id))

    await expect(page.getByText('No tenés acceso a esta rutina')).toBeVisible()
    await expect(
      page.getByRole('button', { name: 'Guardar estructura' }),
    ).toHaveCount(0)
  })
})

test.describe('en móvil', () => {
  test.use({ viewport: { width: 375, height: 740 } })

  test.beforeEach(async ({ page }) => {
    await seedSession(page, coach, 'access-1')
    await routeCurrentUser(page, coach)
  })

  test('carga un ejercicio sin scroll horizontal', async ({ page }) => {
    const { structureBodies } = await routeBackend(page)
    await openStructure(page, volume().id, 'Fase de volumen')

    await page
      .getByRole('button', { name: 'Agregar ejercicio al día 2' })
      .click()
    await page.keyboard.type('sentadilla')
    await page.getByRole('button', { name: 'Agregar Sentadilla' }).click()
    await page.getByRole('button', { name: 'Cerrar buscador' }).click()
    const squat = exerciseItem(page, 'Sentadilla')
    await squat.getByLabel('Series').fill('3')
    await squat.getByLabel('Repeticiones').fill('8')

    // expresión como string: los E2E no tipan el DOM del navegador
    const overflows = await page.evaluate(
      'document.documentElement.scrollWidth > document.documentElement.clientWidth',
    )
    expect(overflows).toBe(false)

    await page.getByRole('button', { name: 'Guardar estructura' }).click()
    await expect(
      notice(page, 'Guardaste la estructura de Fase de volumen.'),
    ).toBeVisible()
    expect(structureBodies()[0].days[1].exercises).toEqual([
      {
        exerciseId: 'ex-squat',
        sets: 3,
        reps: 8,
        recommendedWeight: null,
        rest: null,
        rirRpe: null,
        techniqueNote: null,
      },
    ])
  })
})
