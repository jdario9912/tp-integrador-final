import { expect, test, type Page } from '@playwright/test'
import {
  athleteProfilePath,
  routineDetailPath,
  routineStructurePath,
} from '../src/router/paths.ts'
import {
  apiError,
  coach,
  routeCurrentUser,
  seedSession,
} from './auth-helpers.ts'

// US-16: asignar una rutina a un atleta. El backend se simula con page.route siguiendo el
// contrato: una sola activa por atleta, 409 sin replaceActive y 422 por rutina incompleta

const ATHLETES_URL = /\/api\/athletes(\?.*)?$/
const ATHLETE_URL = /\/api\/athletes\/[^/?]+$/
const WEIGHTS_URL = /\/api\/athletes\/[^/]+\/weights(\?.*)?$/
const ASSIGNMENTS_URL = /\/api\/athletes\/([^/]+)\/assignments(\?.*)?$/
const ROUTINES_URL = /\/api\/routines(\?.*)?$/
const ROUTINE_URL = /\/api\/routines\/[^/?]+$/
const MUSCLE_GROUPS_URL = /\/api\/muscle-groups$/

// día de la asignación que pone el backend (zona de la app)
const TODAY = '2026-11-10'

const athleteJson = (overrides: Record<string, unknown> = {}) => ({
  id: '3f1c2a9e-8b7d-4c1e-9a2b-5d6e7f8a9b0c',
  coachId: coach.id,
  firstName: 'Leo',
  lastName: 'Gil',
  email: 'leo@test.com',
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
  ...overrides,
})

type AthleteJson = ReturnType<typeof athleteJson>

const exercise = {
  id: 'ex-1',
  exerciseId: 'ex-bench',
  exerciseName: 'Press de banca',
  muscleGroup: 'CHEST',
  sortOrder: 0,
  sets: 4,
  reps: 10,
  recommendedWeight: null,
  rest: null,
  rirRpe: null,
  techniqueNote: null,
}

const routineJson = (id: string, name: string, complete = true) => ({
  id,
  name,
  description: null,
  goal: null,
  daysPerWeek: null,
  durationWeeks: null,
  isTemplate: false,
  createdAt: '2026-11-05T12:00:00Z',
  days: complete
    ? [{ id: `${id}-d1`, dayNumber: 1, name: 'Empuje', exercises: [exercise] }]
    : [],
})

type RoutineJson = ReturnType<typeof routineJson>

const volume = routineJson('7c9e6679-7425-40de-944b-e07fc1f90ae7', 'Volumen')
const strength = routineJson('11111111-2222-4333-8444-555555555555', 'Fuerza')
// sin días: el backend no la deja asignar
const draft = routineJson(
  '22222222-3333-4444-8555-666666666666',
  'Borrador',
  false,
)

type AssignmentJson = {
  id: string
  routineId: string
  routineName: string
  assignmentDate: string
  active: boolean
}

type BackendOptions = {
  athletes?: AthleteJson[]
  routines?: RoutineJson[]
  assignments?: AssignmentJson[]
  // el historial falla con 500 hasta que se llame a recoverHistory (el front reintenta solo
  // una vez ante un 5xx, así que fallar solo el primer pedido no alcanza)
  failHistory?: boolean
  // el POST responde 403 (atleta que dejó de estar en la cartera)
  forbidden?: boolean
}

const page0 = <T>(content: T[], size: number) => ({
  content,
  page: 0,
  size,
  totalElements: content.length,
  totalPages: content.length ? 1 : 0,
})

// simula la API del contrato con un estado en memoria. Devuelve los bodies de los POST y
// recoverHistory, para que el historial deje de fallar
const routeBackend = async (
  page: Page,
  {
    athletes = [athleteJson()],
    routines = [volume, strength, draft],
    assignments: initial = [],
    failHistory = false,
    forbidden = false,
  }: BackendOptions = {},
) => {
  const assignments = [...initial]
  const posts: unknown[] = []
  let historyFails = failHistory

  await page.route(MUSCLE_GROUPS_URL, (route) =>
    route.fulfill({
      status: 200,
      json: [{ code: 'CHEST', name: 'Pecho', region: 'UPPER' }],
    }),
  )
  await page.route(WEIGHTS_URL, (route) =>
    route.fulfill({ status: 200, json: page0([], 1) }),
  )
  await page.route(ATHLETES_URL, (route) =>
    route.fulfill({ status: 200, json: page0(athletes, 100) }),
  )
  await page.route(ATHLETE_URL, (route) => {
    const id = new URL(route.request().url()).pathname.split('/').pop()
    const athlete = athletes.find((a) => a.id === id)
    return athlete
      ? route.fulfill({ status: 200, json: athlete })
      : route.fulfill(apiError(404, `No existe el atleta con id ${id}`, ''))
  })
  await page.route(ROUTINES_URL, (route) =>
    route.fulfill({
      status: 200,
      json: page0(
        routines.map(({ days: _days, ...routine }) => routine),
        100,
      ),
    }),
  )
  await page.route(ROUTINE_URL, (route) => {
    const id = new URL(route.request().url()).pathname.split('/').pop()
    const routine = routines.find((r) => r.id === id)
    return routine
      ? route.fulfill({ status: 200, json: routine })
      : route.fulfill(apiError(404, `No existe la rutina con id ${id}`, ''))
  })
  await page.route(ASSIGNMENTS_URL, async (route) => {
    const request = route.request()
    const path = new URL(request.url()).pathname.replace('/api', '')

    if (request.method() === 'GET') {
      if (historyFails) {
        return route.fulfill(
          apiError(
            500,
            'Ocurrió un error inesperado. Intente nuevamente más tarde',
            path,
          ),
        )
      }
      // la activa primero y después por fecha descendente
      const sorted = [...assignments].sort(
        (a, b) =>
          Number(b.active) - Number(a.active) ||
          b.assignmentDate.localeCompare(a.assignmentDate),
      )
      return route.fulfill({ status: 200, json: page0(sorted, 10) })
    }

    const body = request.postDataJSON() as {
      routineId: string
      replaceActive?: boolean
    }
    posts.push(body)
    if (forbidden) {
      return route.fulfill(
        apiError(403, 'No tiene permisos para acceder a este atleta', path),
      )
    }
    const routine = routines.find((r) => r.id === body.routineId)!
    const active = assignments.find((a) => a.active)
    if (routine.days.length === 0) {
      return route.fulfill(
        apiError(
          422,
          'La rutina no tiene días o tiene días sin ejercicios. Complete su estructura antes de asignarla',
          path,
        ),
      )
    }
    if (active?.routineId === routine.id) {
      return route.fulfill(
        apiError(422, 'El atleta ya tiene asignada esta rutina', path),
      )
    }
    if (active && !body.replaceActive) {
      return route.fulfill(
        apiError(
          409,
          `El atleta ya tiene asignada la rutina «${active.routineName}». Confirme el reemplazo para asignar la nueva`,
          path,
        ),
      )
    }
    if (active) active.active = false
    const created = {
      id: `assignment-${assignments.length + 1}`,
      routineId: routine.id,
      routineName: routine.name,
      assignmentDate: TODAY,
      active: true,
    }
    assignments.push(created)
    return route.fulfill({
      status: 201,
      headers: { Location: `${path}/${created.id}` },
      json: created,
    })
  })

  return {
    posts,
    recoverHistory: () => {
      historyFails = false
    },
  }
}

const section = (page: Page, name: string) => page.getByRole('region', { name })

const leo = athleteJson()

const assignFromProfile = async (page: Page, routineName: string) => {
  const active = section(page, 'Rutina activa')
  await active
    .getByRole('button', { name: /Asignar rutina|Cambiar rutina/ })
    .click()
  await active
    .getByRole('combobox', { name: /Rutina/ })
    .selectOption({ label: routineName })
  await active.getByRole('button', { name: 'Asignar', exact: true }).click()
}

test.describe('como entrenador', () => {
  test.beforeEach(async ({ page }) => {
    await seedSession(page, coach, 'access-1')
    await routeCurrentUser(page, coach)
  })

  test('asigna una rutina a un atleta sin rutina desde su ficha', async ({
    page,
  }) => {
    const { posts } = await routeBackend(page)
    await page.goto(athleteProfilePath(leo.id))

    const active = section(page, 'Rutina activa')
    await expect(active).toContainText('Sin rutina asignada')
    await expect(section(page, 'Historial de rutinas')).toContainText(
      'Sin rutinas asignadas',
    )

    await assignFromProfile(page, 'Volumen')

    await expect(active).toContainText('Asignaste la rutina Volumen.')
    await expect(active.getByRole('link', { name: 'Volumen' })).toHaveAttribute(
      'href',
      routineDetailPath(volume.id),
    )
    await expect(active).toContainText('Asignada el 10 de noviembre de 2026.')
    const history = section(page, 'Historial de rutinas')
    await expect(history.getByRole('listitem')).toHaveCount(1)
    await expect(history.getByRole('listitem')).toContainText('Activa')
    expect(posts).toEqual([{ routineId: volume.id, replaceActive: false }])
  })

  test('reemplaza la rutina activa después de confirmar el 409', async ({
    page,
  }) => {
    const { posts } = await routeBackend(page, {
      assignments: [
        {
          id: 'assignment-0',
          routineId: volume.id,
          routineName: volume.name,
          assignmentDate: '2026-10-01',
          active: true,
        },
      ],
    })
    await page.goto(athleteProfilePath(leo.id))

    const active = section(page, 'Rutina activa')
    await expect(active.getByRole('link', { name: 'Volumen' })).toBeVisible()
    await active.getByRole('button', { name: 'Cambiar rutina' }).click()
    // la activa no se puede volver a elegir
    await expect(
      active.getByRole('option', { name: 'Volumen (activa)' }),
    ).toBeDisabled()
    await active
      .getByRole('combobox', { name: /Rutina/ })
      .selectOption({ label: 'Fuerza' })
    await active.getByRole('button', { name: 'Asignar', exact: true }).click()

    const dialog = page.getByRole('dialog', {
      name: '¿Reemplazar la rutina activa?',
    })
    await expect(dialog).toContainText(
      'El atleta ya tiene asignada la rutina «Volumen».',
    )
    await dialog.getByRole('button', { name: 'Reemplazar' }).click()

    await expect(dialog).toBeHidden()
    await expect(active).toContainText('Asignaste la rutina Fuerza.')
    const items = section(page, 'Historial de rutinas').getByRole('listitem')
    await expect(items).toHaveCount(2)
    await expect(items.nth(0)).toContainText('Fuerza')
    await expect(items.nth(0)).toContainText('Activa')
    await expect(items.nth(1)).toContainText('Volumen')
    await expect(items.nth(1)).toContainText('Inactiva')
    expect(posts).toEqual([
      { routineId: strength.id, replaceActive: false },
      { routineId: strength.id, replaceActive: true },
    ])
  })

  test('cancelar el reemplazo no cambia la rutina activa', async ({ page }) => {
    const { posts } = await routeBackend(page, {
      assignments: [
        {
          id: 'assignment-0',
          routineId: volume.id,
          routineName: volume.name,
          assignmentDate: '2026-10-01',
          active: true,
        },
      ],
    })
    await page.goto(athleteProfilePath(leo.id))

    await assignFromProfile(page, 'Fuerza')
    const dialog = page.getByRole('dialog', {
      name: '¿Reemplazar la rutina activa?',
    })
    await dialog.getByRole('button', { name: 'Cancelar' }).click()

    await expect(dialog).toBeHidden()
    const active = section(page, 'Rutina activa')
    await expect(active.getByRole('link', { name: 'Volumen' })).toBeVisible()
    await expect(active.getByRole('alert')).toBeHidden()
    expect(posts).toHaveLength(1)
  })

  test('una rutina incompleta muestra el 422 con el link a su estructura', async ({
    page,
  }) => {
    await routeBackend(page)
    await page.goto(athleteProfilePath(leo.id))

    await assignFromProfile(page, 'Borrador')

    const alert = section(page, 'Rutina activa').getByRole('alert')
    await expect(alert).toContainText(
      'La rutina no tiene días o tiene días sin ejercicios.',
    )
    await expect(
      alert.getByRole('link', { name: 'Configurar estructura' }),
    ).toHaveAttribute('href', routineStructurePath(draft.id))
    await expect(section(page, 'Rutina activa')).toContainText(
      'Sin rutina asignada',
    )
  })

  test('con la cuenta desactivada no se puede asignar', async ({ page }) => {
    const { posts } = await routeBackend(page, {
      athletes: [athleteJson({ active: false })],
    })
    await page.goto(athleteProfilePath(leo.id))

    const active = section(page, 'Rutina activa')
    await expect(
      active.getByRole('button', { name: 'Asignar rutina' }),
    ).toBeDisabled()
    await expect(active).toContainText(
      'La cuenta está desactivada: reactivala para asignarle una rutina.',
    )
    expect(posts).toHaveLength(0)
  })

  test('si falla el historial se puede reintentar', async ({ page }) => {
    const backend = await routeBackend(page, {
      failHistory: true,
      assignments: [
        {
          id: 'assignment-0',
          routineId: volume.id,
          routineName: volume.name,
          assignmentDate: '2026-10-01',
          active: true,
        },
      ],
    })
    await page.goto(athleteProfilePath(leo.id))

    const history = section(page, 'Historial de rutinas')
    await expect(history.getByRole('alert')).toContainText(
      'No se pudo cargar el historial de rutinas.',
    )
    backend.recoverHistory()
    await history.getByRole('button', { name: 'Reintentar' }).click()

    await expect(history.getByRole('listitem')).toContainText('Volumen')
    await expect(
      section(page, 'Rutina activa').getByRole('link', { name: 'Volumen' }),
    ).toBeVisible()
    // el resto de la ficha se ve igual
    await expect(
      page.getByRole('heading', { name: 'Leo Gil', level: 1 }),
    ).toBeVisible()
  })

  test('asigna desde el detalle de la rutina y va a la ficha del atleta', async ({
    page,
  }) => {
    const juana = athleteJson({
      id: '7d1f3c2a-5b6e-4f80-9a1b-2c3d4e5f6a7b',
      firstName: 'Juana',
      lastName: 'Pérez',
      active: false,
    })
    const { posts } = await routeBackend(page, { athletes: [leo, juana] })
    await page.goto(routineDetailPath(volume.id))

    await page.getByRole('button', { name: 'Asignar a atleta' }).click()
    const panel = section(page, 'Asignar a atleta')
    await expect(
      panel.getByRole('option', { name: 'Juana Pérez (cuenta desactivada)' }),
    ).toBeDisabled()
    await panel
      .getByRole('combobox', { name: /Atleta/ })
      .selectOption({ label: 'Leo Gil' })
    await panel.getByRole('button', { name: 'Asignar', exact: true }).click()

    const notice = page.getByRole('status').filter({ hasText: 'Asignaste' })
    await expect(notice).toContainText('Asignaste la rutina a Leo Gil.')
    await expect(panel).toBeHidden()
    expect(posts).toEqual([{ routineId: volume.id, replaceActive: false }])

    await notice.getByRole('link', { name: 'Ver ficha de Leo Gil' }).click()
    await expect(page).toHaveURL(athleteProfilePath(leo.id))
    await expect(
      section(page, 'Rutina activa').getByRole('link', { name: 'Volumen' }),
    ).toBeVisible()
  })

  test('un 403 al asignar muestra el mensaje del backend', async ({ page }) => {
    await routeBackend(page, { forbidden: true })
    await page.goto(routineDetailPath(volume.id))

    await page.getByRole('button', { name: 'Asignar a atleta' }).click()
    const panel = section(page, 'Asignar a atleta')
    await panel
      .getByRole('combobox', { name: /Atleta/ })
      .selectOption({ label: 'Leo Gil' })
    await panel.getByRole('button', { name: 'Asignar', exact: true }).click()

    await expect(panel.getByRole('alert')).toContainText(
      'No tiene permisos para acceder a este atleta',
    )
    await expect(panel).toBeVisible()
  })
})
