import { expect, test, type Page, type Request } from '@playwright/test'
import { foodEditPath, paths } from '../src/router/paths.ts'
import {
  apiError,
  athlete,
  coach,
  routeCurrentUser,
  seedSession,
} from './auth-helpers.ts'

// GET con query params y POST del alta
const FOODS_URL = /\/api\/foods(\?.*)?$/
const FOOD_URL = /\/api\/foods\/[^/?]+$/

type FoodJson = {
  id: string
  name: string
  referencePortionG: number
  caloriesKcal: number
  proteinG: number
  carbsG: number
  fatG: number
}

const foodJson = (id: number, overrides: Partial<FoodJson>): FoodJson => ({
  id: `00000000-0000-4000-8000-${String(id).padStart(12, '0')}`,
  name: `Alimento ${id}`,
  referencePortionG: 100,
  caloriesKcal: 100,
  proteinG: 1,
  carbsG: 1,
  fatG: 1,
  ...overrides,
})

const apple = () =>
  foodJson(1, {
    name: 'Manzana',
    caloriesKcal: 52,
    proteinG: 0.3,
    carbsG: 14,
    fatG: 0.2,
  })
const chicken = () =>
  foodJson(2, {
    name: 'Pechuga de pollo',
    caloriesKcal: 165,
    proteinG: 31,
    carbsG: 0,
    fatG: 3.6,
  })
const rice = () =>
  foodJson(3, {
    name: 'Arroz blanco',
    caloriesKcal: 130,
    proteinG: 2.7,
    carbsG: 28,
    fatG: 0.3,
  })
// relleno para que el catálogo tenga dos páginas de 20: 3 + 19 = 22 alimentos
const fillers = () =>
  Array.from({ length: 19 }, (_, index) =>
    foodJson(10 + index, {
      name: `Snack ${String(index + 1).padStart(2, '0')}`,
    }),
  )

const fieldErrorResponse = (path: string, field: string, message: string) => ({
  status: 400,
  json: {
    ...apiError(400, 'La solicitud tiene campos inválidos', path).json,
    error: 'Bad Request',
    fieldErrors: [{ field, message }],
  },
})

// imita al backend de US-39 en memoria: catálogo global, búsqueda "contiene" sin distinguir
// mayúsculas, orden por nombre, alta y edición con nombre único. El 403 del atleta no se
// simula acá: la UI no le ofrece crear ni editar (RequireRole)
const routeBackend = async (page: Page) => {
  let foods = [apple(), chicken(), rice(), ...fillers()]
  let nextId = 100
  const requests: Request[] = []

  const isDuplicate = (name: string, exceptId?: string) =>
    foods.some(
      (f) =>
        f.id !== exceptId && f.name.toLowerCase() === name.trim().toLowerCase(),
    )

  await page.route(FOODS_URL, (route) => {
    const request = route.request()
    requests.push(request)
    if (request.method() === 'POST') {
      const body = request.postDataJSON()
      if (isDuplicate(body.name)) {
        return route.fulfill(
          apiError(
            409,
            `Ya existe un alimento llamado ${body.name} en el catálogo`,
            '/foods',
          ),
        )
      }
      const created = foodJson(nextId++, body)
      foods = [...foods, created]
      return route.fulfill({ status: 201, json: created })
    }

    const params = new URL(request.url()).searchParams
    const name = params.get('name')?.toLowerCase()
    const pageNumber = Number(params.get('page') ?? 0)
    const size = Number(params.get('size') ?? 20)
    const filtered = foods
      .filter((f) => !name || f.name.toLowerCase().includes(name))
      .sort((a, b) => a.name.localeCompare(b.name))
    return route.fulfill({
      status: 200,
      json: {
        content: filtered.slice(pageNumber * size, (pageNumber + 1) * size),
        page: pageNumber,
        size,
        totalElements: filtered.length,
        totalPages: Math.ceil(filtered.length / size),
      },
    })
  })

  await page.route(FOOD_URL, (route) => {
    const request = route.request()
    requests.push(request)
    const path = new URL(request.url()).pathname.replace('/api', '')
    const id = path.split('/').at(-1)!
    const food = foods.find((f) => f.id === id)
    if (!food) {
      return route.fulfill(
        apiError(404, `No existe el alimento con id ${id}`, path),
      )
    }
    if (request.method() === 'GET') {
      return route.fulfill({ status: 200, json: food })
    }
    const body = request.postDataJSON()
    if (isDuplicate(body.name, id)) {
      return route.fulfill(
        apiError(
          409,
          `Ya existe un alimento llamado ${body.name} en el catálogo`,
          path,
        ),
      )
    }
    const updated = { ...food, ...body }
    foods = foods.map((f) => (f.id === id ? updated : f))
    return route.fulfill({ status: 200, json: updated })
  })

  return requests
}

const paramsOf = (request: Request) =>
  Object.fromEntries(new URL(request.url()).searchParams)

const card = (page: Page, name: string) => page.getByRole('region', { name })

const foodCards = (page: Page) =>
  page.getByRole('list', { name: 'Alimentos' }).getByRole('listitem')

const searchBox = (page: Page) =>
  page.getByRole('searchbox', { name: 'Buscar por nombre' })

// por texto: el skeleton del listado también es un status
const notice = (page: Page, text: string) =>
  page.getByRole('status').filter({ hasText: text })

const fillFood = async (
  page: Page,
  values: {
    name: string
    portion: string
    calories: string
    protein: string
    carbs: string
    fat: string
  },
) => {
  await page.getByLabel('Nombre').fill(values.name)
  await page.getByLabel('Porción de referencia').fill(values.portion)
  await page.getByLabel('Calorías').fill(values.calories)
  await page.getByLabel('Proteínas').fill(values.protein)
  await page.getByLabel('Carbohidratos').fill(values.carbs)
  await page.getByLabel('Grasas').fill(values.fat)
}

const oats = {
  name: 'Avena',
  portion: '40',
  calories: '150.4',
  protein: '5',
  carbs: '27',
  fat: '2.5',
}

test.describe('como entrenador', () => {
  test.beforeEach(async ({ page }) => {
    await seedSession(page, coach, 'access-1')
    await routeCurrentUser(page, coach)
  })

  test('entra al catálogo desde el aside y ve los alimentos ordenados con sus macros', async ({
    page,
  }) => {
    const requests = await routeBackend(page)

    await page.goto(paths.dashboard)
    await page
      .getByRole('navigation', { name: 'Principal' })
      .getByRole('link', { name: 'Alimentos' })
      .click()

    await expect(page).toHaveURL(paths.foods)
    await expect(
      page.getByRole('heading', { name: 'Alimentos', level: 1 }),
    ).toBeVisible()
    await expect(foodCards(page)).toHaveCount(20)
    await expect(foodCards(page).first()).toContainText('Arroz blanco')
    const chickenCard = card(page, 'Pechuga de pollo')
    await expect(chickenCard).toContainText('Porción: 100 g')
    await expect(chickenCard).toContainText('165 kcal')
    await expect(chickenCard).toContainText('31 g')
    await expect(chickenCard).toContainText('3,6 g')
    await expect(
      page.getByRole('button', { name: 'Nuevo alimento' }),
    ).toBeVisible()
    await expect(
      chickenCard.getByRole('link', { name: 'Editar Pechuga de pollo' }),
    ).toBeVisible()

    const list = requests.find((r) => r.url().includes('/foods?'))!
    expect(list.headers().authorization).toBe('Bearer access-1')
    expect(paramsOf(list)).toEqual({ page: '0', size: '20' })
  })

  test('busca por nombre sin distinguir mayúsculas', async ({ page }) => {
    const requests = await routeBackend(page)
    await page.goto(paths.foods)
    await expect(foodCards(page)).toHaveCount(20)

    await searchBox(page).fill('POLLO')

    await expect(foodCards(page)).toHaveCount(1)
    await expect(card(page, 'Pechuga de pollo')).toBeVisible()
    await expect(page).toHaveURL(`${paths.foods}?name=POLLO`)
    await expect
      .poll(() => paramsOf(requests.at(-1)!))
      .toEqual({ page: '0', size: '20', name: 'POLLO' })

    await searchBox(page).fill('zzz')
    await expect(page.getByText('No se encontraron alimentos')).toBeVisible()
  })

  test('pagina el catálogo y guarda la página en la URL', async ({ page }) => {
    await routeBackend(page)
    await page.goto(paths.foods)
    const pagination = page.getByRole('navigation', { name: 'Paginación' })
    await expect(pagination).toContainText('Página 1 de 2 · 22 alimentos')

    await pagination.getByRole('button', { name: 'Siguiente' }).click()

    await expect(page).toHaveURL(`${paths.foods}?page=2`)
    await expect(foodCards(page)).toHaveCount(2)
    await expect(card(page, 'Snack 19')).toBeVisible()
  })

  test('crea un alimento y lo ve en el catálogo', async ({ page }) => {
    const requests = await routeBackend(page)
    await page.goto(paths.foods)

    await page.getByRole('button', { name: 'Nuevo alimento' }).click()
    await expect(page).toHaveURL(paths.newFood)
    // la URL cambia antes de que React muestre la página nueva: sin esperar el título,
    // "Nombre" puede caer en el buscador del listado
    await expect(
      page.getByRole('heading', { name: 'Nuevo alimento', level: 1 }),
    ).toBeVisible()

    await fillFood(page, oats)
    await page.getByRole('button', { name: 'Crear alimento' }).click()

    await expect(page).toHaveURL(paths.foods)
    await expect(notice(page, 'Creaste el alimento Avena.')).toBeVisible()
    await expect(card(page, 'Avena')).toContainText('Porción: 40 g')
    await expect(card(page, 'Avena')).toContainText('150,4 kcal')

    const post = requests.find((r) => r.method() === 'POST')
    expect(post?.postDataJSON()).toEqual({
      name: 'Avena',
      referencePortionG: 40,
      caloriesKcal: 150.4,
      proteinG: 5,
      carbsG: 27,
      fatG: 2.5,
    })
  })

  test('valida el formulario antes de enviar', async ({ page }) => {
    const requests = await routeBackend(page)
    await page.goto(paths.newFood)

    await page.getByRole('button', { name: 'Crear alimento' }).click()

    for (const message of [
      'El nombre es obligatorio',
      'La porción de referencia es obligatoria',
      'Las calorías son obligatorias',
      'Las proteínas son obligatorias',
      'Los carbohidratos son obligatorios',
      'Las grasas son obligatorias',
    ]) {
      await expect(page.getByText(message)).toBeVisible()
    }

    // los rangos y los decimales se validan al salir del campo
    await page.getByLabel('Porción de referencia').fill('0')
    await page.getByLabel('Calorías').fill('10001')
    await page.getByLabel('Proteínas').fill('-1')
    await page.getByLabel('Grasas').fill('1.234')
    await page.getByLabel('Grasas').blur()
    await expect(
      page.getByText('La porción de referencia debe ser mayor a 0'),
    ).toBeVisible()
    await expect(
      page.getByText('Las calorías no pueden superar 10000'),
    ).toBeVisible()
    await expect(
      page.getByText('Las proteínas no pueden ser negativas'),
    ).toBeVisible()
    await expect(
      page.getByText('Las grasas admiten hasta 2 decimales'),
    ).toBeVisible()
    expect(requests.some((r) => r.method() === 'POST')).toBe(false)
  })

  test('si el nombre ya existe muestra el mensaje del backend en el campo', async ({
    page,
  }) => {
    await routeBackend(page)
    await page.goto(paths.newFood)

    await fillFood(page, { ...oats, name: 'manzana' })
    await page.getByRole('button', { name: 'Crear alimento' }).click()

    await expect(
      page.getByText('Ya existe un alimento llamado manzana en el catálogo'),
    ).toBeVisible()
    await expect(page.getByLabel('Nombre')).toHaveAttribute(
      'aria-invalid',
      'true',
    )
    await expect(page).toHaveURL(paths.newFood)
  })

  test('muestra los errores por campo del backend', async ({ page }) => {
    await routeBackend(page)
    await page.route(FOODS_URL, (route) =>
      route.request().method() === 'POST'
        ? route.fulfill(
            fieldErrorResponse(
              '/foods',
              'caloriesKcal',
              'Las calorías admiten hasta 2 decimales',
            ),
          )
        : route.fallback(),
    )
    await page.goto(paths.newFood)

    await fillFood(page, oats)
    await page.getByRole('button', { name: 'Crear alimento' }).click()

    await expect(
      page.getByText('Las calorías admiten hasta 2 decimales'),
    ).toBeVisible()
    await expect(page.getByLabel('Calorías')).toHaveAttribute(
      'aria-invalid',
      'true',
    )
    await expect(page.getByRole('alert')).toHaveCount(0)
  })

  test('un 403 del backend se muestra en el aviso general', async ({
    page,
  }) => {
    await routeBackend(page)
    await page.route(FOODS_URL, (route) =>
      route.request().method() === 'POST'
        ? route.fulfill(
            apiError(
              403,
              'No tiene permisos para acceder a este recurso',
              '/foods',
            ),
          )
        : route.fallback(),
    )
    await page.goto(paths.newFood)

    await fillFood(page, oats)
    await page.getByRole('button', { name: 'Crear alimento' }).click()

    await expect(page.getByRole('alert')).toContainText(
      'No tiene permisos para acceder a este recurso',
    )
    await expect(page).toHaveURL(paths.newFood)
  })

  test('edita un alimento desde el catálogo', async ({ page }) => {
    const requests = await routeBackend(page)
    await page.goto(paths.foods)

    await card(page, 'Manzana')
      .getByRole('link', { name: 'Editar Manzana' })
      .click()
    await expect(page).toHaveURL(foodEditPath(apple().id))
    await expect(
      page.getByRole('heading', { name: 'Editar Manzana', level: 1 }),
    ).toBeVisible()
    await expect(page.getByLabel('Calorías')).toHaveValue('52')

    await page.getByLabel('Nombre').fill('Manzana verde')
    await page.getByLabel('Calorías').fill('48')
    await page.getByRole('button', { name: 'Guardar cambios' }).click()

    await expect(page).toHaveURL(paths.foods)
    await expect(
      notice(page, 'Guardaste los cambios de Manzana verde.'),
    ).toBeVisible()
    await expect(card(page, 'Manzana verde')).toContainText('48 kcal')

    const put = requests.find((r) => r.method() === 'PUT')
    expect(put?.postDataJSON()).toEqual({
      name: 'Manzana verde',
      referencePortionG: 100,
      caloriesKcal: 48,
      proteinG: 0.3,
      carbsG: 14,
      fatG: 0.2,
    })
  })

  test('un alimento que no existe muestra el aviso del backend', async ({
    page,
  }) => {
    await routeBackend(page)
    const missingId = '00000000-0000-4000-8000-999999999999'

    await page.goto(foodEditPath(missingId))

    await expect(page.getByText('No encontramos este alimento')).toBeVisible()
    await expect(
      page.getByText(`No existe el alimento con id ${missingId}`),
    ).toBeVisible()
    await expect(page.getByRole('textbox')).toHaveCount(0)
  })
})

test.describe('como atleta', () => {
  test.beforeEach(async ({ page }) => {
    await seedSession(page, athlete, 'access-1')
    await routeCurrentUser(page, athlete)
  })

  test('consulta el catálogo en modo lectura', async ({ page }) => {
    await routeBackend(page)

    await page.goto(paths.dashboard)
    await page
      .getByRole('navigation', { name: 'Principal' })
      .getByRole('link', { name: 'Alimentos' })
      .click()

    await expect(page).toHaveURL(paths.foods)
    await expect(card(page, 'Manzana')).toContainText('52 kcal')
    await searchBox(page).fill('arroz')
    await expect(foodCards(page)).toHaveCount(1)
    await expect(
      page.getByRole('button', { name: 'Nuevo alimento' }),
    ).toHaveCount(0)
    await expect(page.getByRole('link', { name: /Editar/ })).toHaveCount(0)
  })

  test('no puede entrar al alta ni a la edición', async ({ page }) => {
    await routeBackend(page)

    await page.goto(paths.newFood)
    await expect(page).toHaveURL(paths.dashboard)

    await page.goto(foodEditPath(apple().id))
    await expect(page).toHaveURL(paths.dashboard)
  })
})
