import { expect, test, type Page, type Request } from '@playwright/test'
import { paths, routineDetailPath } from '../src/router/paths.ts'
import {
  apiError,
  athlete,
  coach,
  routeCurrentUser,
  seedSession,
} from './auth-helpers.ts'

// GET con query params y POST del alta
const ROUTINES_URL = /\/api\/routines(\?.*)?$/
const ROUTINE_URL = /\/api\/routines\/[^/?]+$/

type RoutineJson = {
  id: string
  name: string
  description: string | null
  goal: string | null
  daysPerWeek: number | null
  durationWeeks: number | null
  isTemplate: boolean
  createdAt: string
  // solo del mock: dueño de la rutina
  coachId: string
}

const routineJson = (
  id: number,
  overrides: Partial<RoutineJson>,
): RoutineJson => ({
  id: `00000000-0000-4000-9000-${String(id).padStart(12, '0')}`,
  name: `Rutina ${id}`,
  description: null,
  goal: null,
  daysPerWeek: null,
  durationWeeks: null,
  isTemplate: false,
  createdAt: '2026-11-05T12:00:00Z',
  coachId: coach.id,
  ...overrides,
})

const volume = () =>
  routineJson(1, {
    name: 'Fase de volumen',
    goal: 'Hipertrofia',
    daysPerWeek: 4,
    durationWeeks: 8,
    description: 'Bloque de acumulación.',
  })
const strength = () =>
  routineJson(2, { name: 'Fuerza 5x5', daysPerWeek: 3, isTemplate: true })
// de otro entrenador: no aparece en el listado y su detalle responde 403
const foreign = () =>
  routineJson(3, { name: 'Rutina ajena', coachId: 'otro-entrenador' })

// lo que devuelve la API: sin los campos internos del mock
const toResponse = ({ coachId: _coachId, ...rest }: RoutineJson) => rest

// imita al backend de US-13 en memoria: "Mis rutinas" por nombre, alta y detalle
const routeBackend = async (
  page: Page,
  initial: RoutineJson[] = [volume(), strength(), foreign()],
) => {
  let routines = initial
  let nextId = 100
  const requests: Request[] = []

  const mine = () => routines.filter((r) => r.coachId === coach.id)

  await page.route(ROUTINES_URL, (route) => {
    const request = route.request()
    requests.push(request)
    if (request.method() === 'POST') {
      const body = request.postDataJSON()
      const name = body.name.trim()
      // nombre único entre las rutinas del entrenador, sin distinguir mayúsculas
      if (mine().some((r) => r.name.toLowerCase() === name.toLowerCase())) {
        return route.fulfill(
          apiError(409, `Ya tiene una rutina llamada ${name}`, '/routines'),
        )
      }
      const created = routineJson(nextId++, { ...body, name })
      routines = [...routines, created]
      return route.fulfill({
        status: 201,
        headers: { Location: `/api/routines/${created.id}` },
        json: toResponse(created),
      })
    }

    const params = new URL(request.url()).searchParams
    const pageNumber = Number(params.get('page') ?? 0)
    const size = Number(params.get('size') ?? 20)
    const sorted = mine().sort((a, b) => a.name.localeCompare(b.name))
    return route.fulfill({
      status: 200,
      json: {
        content: sorted
          .slice(pageNumber * size, (pageNumber + 1) * size)
          .map(toResponse),
        page: pageNumber,
        size,
        totalElements: sorted.length,
        totalPages: Math.ceil(sorted.length / size),
      },
    })
  })

  await page.route(ROUTINE_URL, (route) => {
    const request = route.request()
    requests.push(request)
    const path = new URL(request.url()).pathname.replace('/api', '')
    const id = path.split('/').at(-1)
    const routine = routines.find((r) => r.id === id)
    if (!routine) {
      return route.fulfill(
        apiError(404, `No existe la rutina con id ${id}`, path),
      )
    }
    return routine.coachId === coach.id
      ? route.fulfill({ status: 200, json: toResponse(routine) })
      : route.fulfill(
          apiError(403, 'No tiene permisos para acceder a esta rutina', path),
        )
  })

  return requests
}

const paramsOf = (request: Request) =>
  Object.fromEntries(new URL(request.url()).searchParams)

const card = (page: Page, name: string) => page.getByRole('region', { name })

const routineCards = (page: Page) =>
  page.getByRole('list', { name: 'Rutinas' }).getByRole('listitem')

// por texto: el skeleton de la página también es un status
const notice = (page: Page, text: string) =>
  page.getByRole('status').filter({ hasText: text })

// la URL cambia antes de que React muestre la página nueva (la navegación es una transición):
// sin esperar el título, los campos podrían buscarse en la página anterior
const openNewRoutine = async (page: Page) => {
  await page.goto(paths.newRoutine)
  await expect(
    page.getByRole('heading', { name: 'Nueva rutina', level: 1 }),
  ).toBeVisible()
}

test.describe('como entrenador', () => {
  test.beforeEach(async ({ page }) => {
    await seedSession(page, coach, 'access-1')
    await routeCurrentUser(page, coach)
  })

  test('entra a sus rutinas desde el aside y ve solo las propias', async ({
    page,
  }) => {
    const requests = await routeBackend(page)

    await page.goto(paths.dashboard)
    await page
      .getByRole('navigation', { name: 'Principal' })
      .getByRole('link', { name: 'Rutinas' })
      .click()

    await expect(page).toHaveURL(paths.routines)
    await expect(
      page.getByRole('heading', { name: 'Mis rutinas', level: 1 }),
    ).toBeVisible()
    await expect(routineCards(page)).toHaveCount(2)
    await expect(routineCards(page).first()).toContainText('Fase de volumen')
    await expect(card(page, 'Fase de volumen')).toContainText('Hipertrofia')
    await expect(card(page, 'Fase de volumen')).toContainText(
      '4 días por semana',
    )
    await expect(card(page, 'Fuerza 5x5')).toContainText('Plantilla')
    await expect(card(page, 'Rutina ajena')).toHaveCount(0)

    const list = requests.find((r) => r.url().includes('/routines?'))!
    expect(list.headers().authorization).toBe('Bearer access-1')
    expect(paramsOf(list)).toEqual({ page: '0', size: '20' })
  })

  test('sin rutinas muestra el estado vacío y lleva al alta', async ({
    page,
  }) => {
    await routeBackend(page, [])
    await page.goto(paths.routines)

    await expect(page.getByText('Todavía no tenés rutinas')).toBeVisible()
    // el del encabezado y el del estado vacío llevan al mismo lugar
    await page.getByRole('button', { name: 'Nueva rutina' }).last().click()

    await expect(page).toHaveURL(paths.newRoutine)
  })

  test('crea una rutina, ve su detalle y la encuentra en el listado', async ({
    page,
  }) => {
    const requests = await routeBackend(page)
    await page.goto(paths.routines)

    await page.getByRole('button', { name: 'Nueva rutina' }).click()
    await expect(page).toHaveURL(paths.newRoutine)
    await expect(
      page.getByRole('heading', { name: 'Nueva rutina', level: 1 }),
    ).toBeVisible()

    await page.getByLabel('Nombre').fill('  Recomposición  ')
    await page.getByLabel('Objetivo').fill('Pérdida de grasa')
    await page.getByLabel('Días por semana').fill('5')
    await page.getByLabel('Duración').fill('12')
    await page.getByLabel('Descripción').fill('Déficit moderado.')
    await page.getByLabel('Guardar como plantilla').check()
    await page.getByRole('button', { name: 'Crear rutina' }).click()

    await expect(page).toHaveURL(/\/routines\/00000000-0000-4000-9000-/)
    await expect(
      page.getByRole('heading', { name: 'Recomposición', level: 1 }),
    ).toBeVisible()
    expect(requests.find((r) => r.method() === 'POST')?.postDataJSON()).toEqual(
      {
        name: 'Recomposición',
        description: 'Déficit moderado.',
        goal: 'Pérdida de grasa',
        daysPerWeek: 5,
        durationWeeks: 12,
        isTemplate: true,
      },
    )
    await expect(notice(page, 'Creaste la rutina Recomposición.')).toBeVisible()
    await expect(page.getByText('5 días por semana')).toBeVisible()
    await expect(page.getByText('12 semanas')).toBeVisible()
    await expect(page.getByText('Déficit moderado.')).toBeVisible()

    await page.getByRole('link', { name: 'Volver a rutinas' }).click()
    await expect(routineCards(page)).toHaveCount(3)
    await expect(card(page, 'Recomposición')).toContainText('Plantilla')
  })

  test('solo con el nombre manda los opcionales en null', async ({ page }) => {
    const requests = await routeBackend(page)
    await openNewRoutine(page)

    await page.getByLabel('Nombre').fill('Movilidad')
    await page.getByRole('button', { name: 'Crear rutina' }).click()

    await expect(
      page.getByRole('heading', { name: 'Movilidad', level: 1 }),
    ).toBeVisible()
    await expect(page.getByText('Sin objetivo')).toBeVisible()
    expect(requests.find((r) => r.method() === 'POST')?.postDataJSON()).toEqual(
      {
        name: 'Movilidad',
        description: null,
        goal: null,
        daysPerWeek: null,
        durationWeeks: null,
        isTemplate: false,
      },
    )
  })

  test('valida el formulario antes de enviar', async ({ page }) => {
    const requests = await routeBackend(page)
    await openNewRoutine(page)

    await page.getByRole('button', { name: 'Crear rutina' }).click()
    await expect(page.getByText('El nombre es obligatorio')).toBeVisible()

    await page.getByLabel('Días por semana').fill('8')
    await page.getByLabel('Días por semana').blur()
    await expect(
      page.getByText('Los días por semana deben estar entre 1 y 7'),
    ).toBeVisible()

    await page.getByLabel('Duración').fill('0')
    await page.getByLabel('Duración').blur()
    await expect(
      page.getByText('La duración debe estar entre 1 y 52 semanas'),
    ).toBeVisible()

    await page.getByLabel('Nombre').fill('Rutina válida')
    await page.getByRole('button', { name: 'Crear rutina' }).click()
    await expect(page).toHaveURL(paths.newRoutine)
    expect(requests.some((r) => r.method() === 'POST')).toBe(false)
  })

  test('un nombre repetido se marca en el campo', async ({ page }) => {
    await routeBackend(page)
    await openNewRoutine(page)

    await page.getByLabel('Nombre').fill('FASE DE VOLUMEN')
    await page.getByRole('button', { name: 'Crear rutina' }).click()

    await expect(
      page.getByText('Ya tiene una rutina llamada FASE DE VOLUMEN'),
    ).toBeVisible()
    await expect(page.getByLabel('Nombre')).toHaveAttribute(
      'aria-invalid',
      'true',
    )
    await expect(page).toHaveURL(paths.newRoutine)
  })

  test('muestra los errores por campo del backend', async ({ page }) => {
    await routeBackend(page)
    await page.route(ROUTINES_URL, (route) =>
      route.request().method() === 'POST'
        ? route.fulfill({
            status: 400,
            json: {
              ...apiError(
                400,
                'La solicitud tiene campos inválidos',
                '/routines',
              ).json,
              error: 'Bad Request',
              fieldErrors: [
                {
                  field: 'goal',
                  message: 'El objetivo no puede superar los 100 caracteres',
                },
              ],
            },
          })
        : route.fallback(),
    )
    await openNewRoutine(page)

    await page.getByLabel('Nombre').fill('Rutina')
    await page.getByLabel('Objetivo').fill('Fuerza')
    await page.getByRole('button', { name: 'Crear rutina' }).click()

    await expect(
      page.getByText('El objetivo no puede superar los 100 caracteres'),
    ).toBeVisible()
    await expect(page.getByLabel('Objetivo')).toHaveAttribute(
      'aria-invalid',
      'true',
    )
  })

  test('abre el detalle desde el listado', async ({ page }) => {
    await routeBackend(page)
    await page.goto(paths.routines)

    await card(page, 'Fase de volumen')
      .getByRole('link', { name: 'Ver rutina Fase de volumen' })
      .click()

    await expect(page).toHaveURL(routineDetailPath(volume().id))
    await expect(
      page.getByRole('heading', { name: 'Fase de volumen', level: 1 }),
    ).toBeVisible()
    await expect(page.getByText('Bloque de acumulación.')).toBeVisible()
    await expect(page.getByText('8 semanas')).toBeVisible()
    await expect(page.getByRole('textbox')).toHaveCount(0)
  })

  test('una rutina de otro entrenador muestra el aviso', async ({ page }) => {
    await routeBackend(page)

    await page.goto(routineDetailPath(foreign().id))

    await expect(page.getByText('No tenés acceso a esta rutina')).toBeVisible()
    await page.getByRole('link', { name: 'Volver a rutinas' }).click()
    await expect(page).toHaveURL(paths.routines)
  })

  test('una rutina inexistente muestra el aviso', async ({ page }) => {
    await routeBackend(page)

    await page.goto(routineDetailPath('00000000-0000-4000-9000-999999999999'))

    await expect(page.getByText('La rutina no existe')).toBeVisible()
  })
})

test('un atleta no puede entrar a las rutinas', async ({ page }) => {
  await seedSession(page, athlete, 'access-1')
  await routeCurrentUser(page, athlete)

  await page.goto(paths.newRoutine)

  await expect(page).toHaveURL(paths.dashboard)
  await expect(
    page
      .getByRole('navigation', { name: 'Principal' })
      .getByRole('link', { name: 'Rutinas' }),
  ).toHaveCount(0)
})
