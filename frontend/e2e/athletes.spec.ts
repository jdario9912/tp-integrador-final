import { expect, test, type Page, type Request } from '@playwright/test'
import { paths } from '../src/router/paths.ts'
import {
  apiError,
  athlete,
  authResponse,
  coach,
  REFRESH_URL,
  routeCurrentUser,
  seedSession,
} from './auth-helpers.ts'
import { E2E_API_URL } from './config.ts'

// GET /athletes con o sin query params; el POST del alta se deja pasar
const ATHLETES_URL = /\/api\/athletes(\?.*)?$/
const PAGE_SIZE = 20

type AthleteJson = ReturnType<typeof athleteJson>

const athleteJson = (
  index: number,
  overrides: Partial<{
    firstName: string
    lastName: string
    status: string
    goal: string | null
    initialWeightKg: number | null
  }> = {},
) => ({
  id: `00000000-0000-4000-8000-${String(index).padStart(12, '0')}`,
  coachId: coach.id,
  firstName: `Atleta${index}`,
  lastName: `Apellido${String(index).padStart(2, '0')}`,
  email: `atleta${index}@example.com`,
  phone: null,
  status: 'ACTIVE',
  active: true,
  sex: null,
  experienceLevel: null,
  birthDate: null,
  heightCm: null,
  initialWeightKg: null as number | null,
  goal: null as string | null,
  injuries: null,
  limitations: null,
  availableDays: null,
  startDate: null,
  createdAt: '2026-10-27T13:29:17.592032Z',
  ...overrides,
})

const juana = athleteJson(1, {
  firstName: 'Juana',
  lastName: 'Pérez',
  goal: 'Hipertrofia',
  initialWeightKg: 62.5,
})
const lucas = athleteJson(2, {
  firstName: 'Lucas',
  lastName: 'Gómez',
  status: 'NEEDS_REVIEW',
  goal: 'Pérdida de grasa',
  initialWeightKg: 95,
})
const sofia = athleteJson(3, {
  firstName: 'Sofía',
  lastName: 'Ramírez',
  status: 'INACTIVE',
})

// imita al backend: filtra por nombre y objetivo (AND, contiene, sin mayúsculas) y pagina desde 0
const pageOf = (athletes: AthleteJson[], params: URLSearchParams) => {
  const name = params.get('name')?.toLowerCase()
  const goal = params.get('goal')?.toLowerCase()
  const page = Number(params.get('page') ?? 0)
  const size = Number(params.get('size') ?? PAGE_SIZE)
  const filtered = athletes.filter(
    (a) =>
      (!name || `${a.firstName} ${a.lastName}`.toLowerCase().includes(name)) &&
      (!goal || (a.goal ?? '').toLowerCase().includes(goal)),
  )
  return {
    content: filtered.slice(page * size, (page + 1) * size),
    page,
    size,
    totalElements: filtered.length,
    totalPages: Math.ceil(filtered.length / size),
  }
}

// responde GET /athletes con los atletas dados y registra cada pedido
const routeAthletes = async (page: Page, athletes: AthleteJson[]) => {
  const requests: Request[] = []
  await page.route(ATHLETES_URL, (route) => {
    if (route.request().method() !== 'GET') return route.fallback()
    requests.push(route.request())
    const params = new URL(route.request().url()).searchParams
    return route.fulfill({ status: 200, json: pageOf(athletes, params) })
  })
  return requests
}

const paramsOf = (request: Request) =>
  Object.fromEntries(new URL(request.url()).searchParams)

const card = (page: Page, name: string) => page.getByRole('region', { name })

// solo las cards: la barra de ubicación también usa items de lista
const athleteCards = (page: Page) =>
  page.getByRole('list', { name: 'Atletas' }).getByRole('listitem')

const nameSearch = (page: Page) =>
  page.getByRole('searchbox', { name: 'Buscar por nombre' })

const goalSearch = (page: Page) =>
  page.getByRole('searchbox', { name: 'Buscar por objetivo' })

const manyAthletes = (count: number) =>
  Array.from({ length: count }, (_, index) => athleteJson(index + 1))

test.describe('como entrenador', () => {
  test.beforeEach(async ({ page }) => {
    await seedSession(page, coach, 'access-1')
    await routeCurrentUser(page, coach)
  })

  test('entra a sus atletas desde el aside y los ve', async ({ page }) => {
    const requests = await routeAthletes(page, [lucas, juana, sofia])

    await page.goto(paths.dashboard)
    await page
      .getByRole('navigation', { name: 'Principal' })
      .getByRole('link', { name: 'Atletas' })
      .click()

    await expect(page).toHaveURL(paths.athletes)
    await expect(
      page.getByRole('navigation', { name: 'Ubicación' }),
    ).toContainText('Atletas')
    await expect(
      page.getByRole('heading', { name: 'Atletas', level: 1 }),
    ).toBeVisible()

    await expect(card(page, 'Juana Pérez')).toContainText('Activo')
    await expect(card(page, 'Juana Pérez')).toContainText('Hipertrofia')
    await expect(card(page, 'Juana Pérez')).toContainText('62,5 kg')
    await expect(card(page, 'Lucas Gómez')).toContainText('Requiere revisión')
    await expect(card(page, 'Sofía Ramírez')).toContainText('Inactivo')

    expect(requests[0].headers().authorization).toBe('Bearer access-1')
    expect(paramsOf(requests[0])).toEqual({ page: '0', size: '20' })
  })

  test('los datos opcionales vacíos se muestran con un reemplazo', async ({
    page,
  }) => {
    await routeAthletes(page, [sofia])

    await page.goto(paths.athletes)

    await expect(card(page, 'Sofía Ramírez')).toContainText('Sin objetivo')
    await expect(card(page, 'Sofía Ramírez')).toContainText('—')
    await expect(page.getByRole('main')).not.toContainText(/null|undefined/)
  })

  test('busca por nombre, por objetivo y por los dos', async ({ page }) => {
    const requests = await routeAthletes(page, [juana, lucas, sofia])
    await page.goto(paths.athletes)
    await expect(card(page, 'Juana Pérez')).toBeVisible()

    await nameSearch(page).fill('lu')
    await expect(card(page, 'Juana Pérez')).toBeHidden()
    await expect(card(page, 'Lucas Gómez')).toBeVisible()
    await expect(page).toHaveURL(`${paths.athletes}?name=lu`)
    await expect
      .poll(() => paramsOf(requests.at(-1)!))
      .toEqual({
        page: '0',
        size: '20',
        name: 'lu',
      })

    await nameSearch(page).fill('')
    await goalSearch(page).fill('hiper')
    await expect(card(page, 'Juana Pérez')).toBeVisible()
    await expect(card(page, 'Lucas Gómez')).toBeHidden()
    await expect
      .poll(() => paramsOf(requests.at(-1)!))
      .toEqual({
        page: '0',
        size: '20',
        goal: 'hiper',
      })

    await nameSearch(page).fill('juana')
    await expect
      .poll(() => paramsOf(requests.at(-1)!))
      .toEqual({
        page: '0',
        size: '20',
        name: 'juana',
        goal: 'hiper',
      })
    await expect(card(page, 'Juana Pérez')).toBeVisible()
  })

  test('al limpiar la búsqueda vuelven todos los atletas', async ({ page }) => {
    await routeAthletes(page, [juana, lucas, sofia])
    await page.goto(`${paths.athletes}?name=lu`)
    await expect(nameSearch(page)).toHaveValue('lu')
    await expect(card(page, 'Juana Pérez')).toBeHidden()

    await nameSearch(page).fill('')

    await expect(card(page, 'Juana Pérez')).toBeVisible()
    await expect(card(page, 'Sofía Ramírez')).toBeVisible()
    await expect(page).toHaveURL(paths.athletes)
  })

  test('una búsqueda sin resultados lo avisa', async ({ page }) => {
    await routeAthletes(page, [juana, lucas])
    await page.goto(paths.athletes)

    await nameSearch(page).fill('zzz')

    await expect(
      page.getByRole('heading', { name: 'No se encontraron atletas' }),
    ).toBeVisible()
    await expect(page.getByRole('list', { name: 'Atletas' })).toBeHidden()
  })

  test('sin atletas invita a crear el primero', async ({ page }) => {
    await routeAthletes(page, [])
    await page.goto(paths.athletes)

    await expect(
      page.getByRole('heading', { name: 'Todavía no tenés atletas' }),
    ).toBeVisible()
    await expect(
      page.getByRole('navigation', { name: 'Paginación' }),
    ).toBeHidden()

    await page
      .getByRole('main')
      .getByRole('button', { name: 'Agregar atleta' })
      .last()
      .click()
    await expect(page).toHaveURL(paths.newAthlete)
  })

  test('pagina, guarda la página en la URL y vuelve atrás', async ({
    page,
  }) => {
    const requests = await routeAthletes(page, manyAthletes(45))
    await page.goto(paths.athletes)
    const pagination = page.getByRole('navigation', { name: 'Paginación' })

    await expect(pagination).toContainText('Página 1 de 3 · 45 atletas')
    await expect(athleteCards(page)).toHaveCount(20)
    await expect(
      pagination.getByRole('button', { name: 'Anterior' }),
    ).toBeDisabled()

    await pagination.getByRole('button', { name: 'Siguiente' }).click()
    await expect(pagination).toContainText('Página 2 de 3')
    await expect(page).toHaveURL(`${paths.athletes}?page=2`)
    await expect.poll(() => paramsOf(requests.at(-1)!).page).toBe('1')

    await pagination.getByRole('button', { name: 'Siguiente' }).click()
    await expect(pagination).toContainText('Página 3 de 3')
    await expect(athleteCards(page)).toHaveCount(5)
    await expect(
      pagination.getByRole('button', { name: 'Siguiente' }),
    ).toBeDisabled()

    await page.goBack()
    await expect(page).toHaveURL(`${paths.athletes}?page=2`)
    await expect(pagination).toContainText('Página 2 de 3')
  })

  test('buscar vuelve a la primera página', async ({ page }) => {
    const requests = await routeAthletes(page, manyAthletes(45))
    await page.goto(`${paths.athletes}?page=3`)
    await expect(
      page.getByRole('navigation', { name: 'Paginación' }),
    ).toContainText('Página 3 de 3')

    await nameSearch(page).fill('atleta1')

    await expect(page).toHaveURL(`${paths.athletes}?name=atleta1`)
    await expect
      .poll(() => paramsOf(requests.at(-1)!))
      .toEqual({
        page: '0',
        size: '20',
        name: 'atleta1',
      })
    // Atleta1 y Atleta10..19
    await expect(athleteCards(page)).toHaveCount(11)
  })

  test('un link con página y búsqueda la respeta', async ({ page }) => {
    const requests = await routeAthletes(page, manyAthletes(45))

    await page.goto(`${paths.athletes}?page=2&name=atleta`)

    await expect(nameSearch(page)).toHaveValue('atleta')
    await expect(
      page.getByRole('navigation', { name: 'Paginación' }),
    ).toContainText('Página 2 de 3')
    expect(paramsOf(requests[0])).toEqual({
      page: '1',
      size: '20',
      name: 'atleta',
    })
  })

  test('una página que no existe lleva a la última', async ({ page }) => {
    await routeAthletes(page, manyAthletes(45))

    await page.goto(`${paths.athletes}?page=99`)

    await expect(page).toHaveURL(`${paths.athletes}?page=3`)
    await expect(
      page.getByRole('navigation', { name: 'Paginación' }),
    ).toContainText('Página 3 de 3')
  })

  test('muestra skeletons mientras carga', async ({ page }) => {
    let release = () => {}
    const released = new Promise<void>((resolve) => (release = resolve))
    await page.route(ATHLETES_URL, async (route) => {
      await released
      return route.fulfill({
        status: 200,
        json: pageOf([juana], new URLSearchParams()),
      })
    })

    await page.goto(paths.athletes)

    await expect(
      page.getByRole('status', { name: 'Cargando atletas' }),
    ).toBeVisible()
    release()
    await expect(card(page, 'Juana Pérez')).toBeVisible()
    await expect(
      page.getByRole('status', { name: 'Cargando atletas' }),
    ).toBeHidden()
  })

  test('si el servidor falla muestra el error y permite reintentar', async ({
    page,
  }) => {
    let failing = true
    await page.route(ATHLETES_URL, (route) =>
      failing
        ? route.fulfill(
            apiError(
              500,
              'Ocurrió un error inesperado. Intente nuevamente más tarde',
              '/athletes',
            ),
          )
        : route.fulfill({
            status: 200,
            json: pageOf([juana], new URLSearchParams()),
          }),
    )

    await page.goto(paths.athletes)

    await expect(page.getByRole('alert')).toContainText(
      'Ocurrió un error inesperado. Intente nuevamente más tarde',
    )
    failing = false
    await page.getByRole('button', { name: 'Reintentar' }).click()
    await expect(card(page, 'Juana Pérez')).toBeVisible()
    await expect(page.getByRole('alert')).toBeHidden()
  })

  test('sin conexión lo avisa', async ({ page }) => {
    await page.route(ATHLETES_URL, (route) => route.abort('failed'))

    await page.goto(paths.athletes)

    await expect(page.getByRole('alert')).toContainText(
      'No se pudo conectar con el servidor',
    )
  })

  test('si el backend niega el acceso muestra su mensaje', async ({ page }) => {
    await page.route(ATHLETES_URL, (route) =>
      route.fulfill(
        apiError(
          403,
          'No tiene permisos para acceder a este recurso',
          '/athletes',
        ),
      ),
    )

    await page.goto(paths.athletes)

    await expect(page.getByRole('alert')).toContainText(
      'No tiene permisos para acceder a este recurso',
    )
  })

  test('al volver de un alta el nuevo atleta aparece en la lista', async ({
    page,
  }) => {
    const athletes = [lucas]
    await routeAthletes(page, athletes)
    await page.route(`${E2E_API_URL}/athletes`, (route) => {
      if (route.request().method() !== 'POST') return route.fallback()
      athletes.push(juana)
      return route.fulfill({ status: 201, json: juana })
    })
    await page.goto(paths.athletes)
    await expect(card(page, 'Lucas Gómez')).toBeVisible()

    await page
      .getByRole('main')
      .getByRole('button', { name: 'Agregar atleta' })
      .click()
    await expect(page).toHaveURL(paths.newAthlete)
    // esperar el formulario: si no, 'Nombre' puede resolver al buscador de la página anterior
    await expect(
      page.getByRole('heading', { name: 'Agregar nuevo atleta' }),
    ).toBeVisible()
    await page.getByRole('textbox', { name: 'Nombre *' }).fill('Juana')
    await page.getByLabel('Apellido').fill('Pérez')
    await page.getByLabel('Email').fill('juana@example.com')
    await page.getByLabel('Contraseña').fill('12345678')
    await page.getByRole('button', { name: 'Guardar atleta' }).click()
    await expect(page).toHaveURL(paths.dashboard)

    await page
      .getByRole('navigation', { name: 'Principal' })
      .getByRole('link', { name: 'Atletas' })
      .click()

    await expect(card(page, 'Juana Pérez')).toBeVisible()
    await expect(card(page, 'Lucas Gómez')).toBeVisible()
  })
})

test.describe('con el access token vencido', () => {
  test.beforeEach(async ({ page }) => {
    await seedSession(page, coach, 'access-vencido')
    await routeCurrentUser(page, coach, 'access-nuevo')
    await page.route(ATHLETES_URL, (route) =>
      route.request().headers().authorization === 'Bearer access-nuevo'
        ? route.fulfill({
            status: 200,
            json: pageOf([juana], new URLSearchParams()),
          })
        : route.fulfill(
            apiError(
              401,
              'Debe iniciar sesión para acceder a este recurso',
              '/athletes',
            ),
          ),
    )
  })

  test('refresca la sesión y muestra los atletas', async ({ page }) => {
    await page.route(REFRESH_URL, (route) =>
      route.fulfill({ status: 200, json: authResponse(coach, 'access-nuevo') }),
    )

    await page.goto(paths.athletes)

    await expect(card(page, 'Juana Pérez')).toBeVisible()
    await expect(page).toHaveURL(paths.athletes)
  })

  test('si el refresh falla vuelve al login', async ({ page }) => {
    await page.route(REFRESH_URL, (route) =>
      route.fulfill(apiError(401, 'Sesión expirada', '/auth/refresh')),
    )

    await page.goto(paths.athletes)

    await expect(page).toHaveURL(paths.login)
  })
})

test('un atleta no ve ni puede entrar al listado de atletas', async ({
  page,
}) => {
  await seedSession(page, athlete, 'access-1')
  await routeCurrentUser(page, athlete)

  await page.goto(paths.dashboard)
  await expect(
    page
      .getByRole('navigation', { name: 'Principal' })
      .getByRole('link', { name: 'Atletas' }),
  ).toBeHidden()

  await page.goto(paths.athletes)
  await expect(page).toHaveURL(paths.dashboard)
})

test('sin sesión el listado redirige al login', async ({ page }) => {
  await page.goto(paths.athletes)

  await expect(page).toHaveURL(paths.login)
})
