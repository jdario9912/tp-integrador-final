import {
  expect,
  test,
  type Page,
  type Request,
  type Route,
} from '@playwright/test'
import { paths } from '../src/router/paths.ts'
import {
  apiError,
  athlete,
  coach,
  routeCurrentUser,
  seedSession,
} from './auth-helpers.ts'

const ROUTINE_URL = /\/api\/athletes\/[^/]+\/routine$/
const MUSCLE_GROUPS_URL = /\/api\/muscle-groups$/
// iniciar y retomar el entrenamiento (US-18) se prueba en training-session.spec.ts
const IN_PROGRESS_URL = /\/api\/athletes\/[^/]+\/sessions\/in-progress$/

const TORSO_ID = 'c3d4e5f6-0718-4293-a4b5-c6d7e8f90a1b'
const LEGS_ID = 'd4e5f607-1829-43a4-b5c6-d7e8f90a1b2c'

// respuesta de GET /athletes/{athleteId}/routine: el ejemplo del contrato de API (9.3)
const activeRoutine = (overrides: Record<string, unknown> = {}) => ({
  assignmentId: '8b1e4c2d-5f6a-4b7c-9d8e-0f1a2b3c4d5e',
  assignmentDate: '2026-11-03',
  endDate: '2026-12-28',
  expired: false,
  nextDayId: TORSO_ID,
  routine: {
    id: '5a6b7c8d-9e0f-4a1b-8c2d-3e4f5a6b7c8d',
    name: 'Fuerza 2 días',
    description: 'Bloque de 8 semanas con progresión de cargas',
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

const muscleGroups = [
  { code: 'CHEST', name: 'Pecho', region: 'UPPER' },
  { code: 'BACK', name: 'Espalda', region: 'UPPER' },
  { code: 'QUADRICEPS', name: 'Cuádriceps', region: 'LOWER' },
]

type ReplyOptions = NonNullable<Parameters<Route['fulfill']>[0]>

// responde la rutina con lo que devuelva `reply` en cada pedido y guarda los pedidos
const routeRoutine = async (page: Page, reply: () => ReplyOptions) => {
  const requests: Request[] = []
  await page.route(ROUTINE_URL, (route) => {
    requests.push(route.request())
    return route.fulfill(reply())
  })
  return requests
}

const dayTab = (page: Page, name: string) =>
  page.getByRole('tab', { name, exact: true })

const exerciseItems = (page: Page) =>
  page.getByRole('list', { name: 'Ejercicios' }).getByRole('listitem')

// la URL cambia antes de que React muestre la página (la navegación es una transición)
const openMyRoutine = async (page: Page) => {
  await page.goto(paths.myRoutine)
  await expect(
    page.getByRole('heading', { name: 'Mi rutina', level: 1 }),
  ).toBeVisible()
}

test.describe('como atleta', () => {
  test.beforeEach(async ({ page }) => {
    await seedSession(page, athlete, 'access-1')
    await routeCurrentUser(page, athlete)
    await page.route(MUSCLE_GROUPS_URL, (route) =>
      route.fulfill({ status: 200, json: muscleGroups }),
    )
    // sin entrenamiento en curso
    await page.route(IN_PROGRESS_URL, (route) => route.fulfill({ status: 204 }))
  })

  test('entra a Mi rutina desde el menú y ve el día que le toca', async ({
    page,
  }) => {
    const requests = await routeRoutine(page, () => ({
      status: 200,
      json: activeRoutine(),
    }))
    await page.goto(paths.dashboard)

    await page
      .getByRole('navigation', { name: 'Principal' })
      .getByRole('link', { name: 'Mi rutina' })
      .click()

    await expect(page).toHaveURL(paths.myRoutine)
    await expect(
      page.getByRole('navigation', { name: 'Ubicación' }),
    ).toContainText('Mi rutina')
    await expect(page.getByText('Fuerza 2 días')).toBeVisible()
    await expect(
      page.getByText('Vigente hasta el 28 de diciembre de 2026'),
    ).toBeVisible()

    const today = dayTab(page, 'Día 1: Torso, hoy')
    await expect(today).toHaveAttribute('aria-selected', 'true')
    await expect(today.getByText('Torso')).toBeVisible()
    await expect(page.getByText('Hoy te toca')).toBeVisible()
    await expect(
      page.getByRole('heading', { name: 'Día 1: Torso', level: 2 }),
    ).toBeVisible()
    await expect(exerciseItems(page)).toHaveCount(2)
    const bench = exerciseItems(page).first()
    await expect(bench).toContainText('Press de banca')
    await expect(bench).toContainText('Pecho')
    await expect(bench).toContainText('4 × 8')
    await expect(bench).toContainText('62,5 kg')
    await expect(bench).toContainText('2 min')
    await expect(bench).toContainText('RIR 2')
    await expect(bench).toContainText('Bajar controlado hasta tocar el pecho')
    await expect(exerciseItems(page).last()).toContainText('Remo con barra')

    expect(new URL(requests[0].url()).pathname).toBe(
      `/api/athletes/${athlete.id}/routine`,
    )
    expect(requests[0].headers().authorization).toBe('Bearer access-1')
  })

  test('cambia de día con el teclado', async ({ page }) => {
    await routeRoutine(page, () => ({ status: 200, json: activeRoutine() }))
    await openMyRoutine(page)
    await expect(exerciseItems(page)).toHaveCount(2)

    await dayTab(page, 'Día 1: Torso, hoy').focus()
    await page.keyboard.press('ArrowRight')

    const legs = dayTab(page, 'Día 2: Pierna')
    await expect(legs).toBeFocused()
    await expect(legs).toHaveAttribute('aria-selected', 'true')
    await expect(
      page.getByRole('heading', { name: 'Día 2: Pierna', level: 2 }),
    ).toBeVisible()
    await expect(page.getByText('Hoy te toca')).toBeHidden()
    await expect(exerciseItems(page)).toHaveCount(1)
    await expect(exerciseItems(page).first()).toContainText('Sentadilla')
    await expect(exerciseItems(page).first()).toContainText('Cuádriceps')
    await expect(exerciseItems(page).first()).toContainText('RPE 8.5')

    await page.keyboard.press('Home')
    await expect(dayTab(page, 'Día 1: Torso, hoy')).toBeFocused()
    await expect(page.getByText('Hoy te toca')).toBeVisible()
  })

  test('sin rutina asignada ve el mensaje', async ({ page }) => {
    await routeRoutine(page, () => ({ status: 204 }))

    await openMyRoutine(page)

    await expect(
      page.getByText('Tu entrenador aún no te asignó una rutina'),
    ).toBeVisible()
    await expect(page.getByRole('tablist')).toHaveCount(0)
  })

  test('con la rutina vencida ve el aviso y la sigue viendo', async ({
    page,
  }) => {
    await routeRoutine(page, () => ({
      status: 200,
      json: activeRoutine({
        assignmentDate: '2026-09-01',
        endDate: '2026-09-28',
        expired: true,
      }),
    }))

    await openMyRoutine(page)

    await expect(page.getByRole('note')).toContainText(
      'Rutina vencida: terminó el 28 de septiembre de 2026.',
    )
    await expect(exerciseItems(page)).toHaveCount(2)
  })

  test('si el servidor falla muestra el error y permite reintentar', async ({
    page,
  }) => {
    let failing = true
    await routeRoutine(page, () =>
      failing
        ? apiError(
            500,
            'Ocurrió un error inesperado. Intente nuevamente más tarde',
            `/athletes/${athlete.id}/routine`,
          )
        : { status: 200, json: activeRoutine() },
    )

    await openMyRoutine(page)

    await expect(page.getByRole('alert')).toContainText(
      'Ocurrió un error inesperado. Intente nuevamente más tarde',
    )
    failing = false
    await page.getByRole('button', { name: 'Reintentar' }).click()
    await expect(exerciseItems(page)).toHaveCount(2)
    await expect(page.getByRole('alert')).toBeHidden()
  })
})

test.describe('en móvil', () => {
  test.use({ viewport: { width: 375, height: 740 } })

  test.beforeEach(async ({ page }) => {
    await seedSession(page, athlete, 'access-1')
    await routeCurrentUser(page, athlete)
    await page.route(MUSCLE_GROUPS_URL, (route) =>
      route.fulfill({ status: 200, json: muscleGroups }),
    )
    // sin entrenamiento en curso
    await page.route(IN_PROGRESS_URL, (route) => route.fulfill({ status: 204 }))
  })

  test('ve el día que le toca sin scroll horizontal y cambia de día', async ({
    page,
  }) => {
    await routeRoutine(page, () => ({ status: 200, json: activeRoutine() }))

    await openMyRoutine(page)

    const today = dayTab(page, 'Día 1: Torso, hoy')
    await expect(today).toHaveAttribute('aria-selected', 'true')
    // en móvil la pestaña muestra solo "Día N" y la marca; el nombre va en el título del panel
    await expect(today.getByText('Torso')).toBeHidden()
    await expect(today.getByText('Hoy')).toBeVisible()
    await expect(
      page.getByRole('heading', { name: 'Día 1: Torso', level: 2 }),
    ).toBeInViewport()
    await expect(exerciseItems(page)).toHaveCount(2)

    // expresión como string: los E2E no tipan el DOM del navegador
    const overflows = await page.evaluate(
      'document.documentElement.scrollWidth > document.documentElement.clientWidth',
    )
    expect(overflows).toBe(false)

    await dayTab(page, 'Día 2: Pierna').click()
    await expect(
      page.getByRole('heading', { name: 'Día 2: Pierna', level: 2 }),
    ).toBeVisible()
    await expect(exerciseItems(page).first()).toContainText('Sentadilla')
  })
})

test('un entrenador no puede entrar a Mi rutina', async ({ page }) => {
  await seedSession(page, coach, 'access-1')
  await routeCurrentUser(page, coach)

  await page.goto(paths.myRoutine)

  await expect(page).toHaveURL(paths.dashboard)
  await expect(
    page
      .getByRole('navigation', { name: 'Principal' })
      .getByRole('link', { name: 'Mi rutina' }),
  ).toHaveCount(0)
})
