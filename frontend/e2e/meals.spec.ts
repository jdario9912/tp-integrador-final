import { expect, test, type Page, type Request } from '@playwright/test'
import { paths } from '../src/router/paths.ts'
import {
  apiError,
  athlete,
  coach,
  routeCurrentUser,
  seedSession,
} from './auth-helpers.ts'

// GET (del día) y POST del alta; PUT de la edición; DELETE del borrado
const MEALS_URL = /\/api\/athletes\/[^/]+\/meals(\?.*)?$/
const MEAL_URL = /\/api\/athletes\/[^/]+\/meals\/[^/?]+$/
// resumen del día (US-24): otra ruta, no pasa por MEALS_URL ni por MEAL_URL
const SUMMARY_URL = /\/api\/athletes\/[^/]+\/meals\/summary(\?.*)?$/
// buscador de alimentos del catálogo
const FOODS_URL = /\/api\/foods(\?.*)?$/

// 16:30 del 13/11 en Argentina. El navegador del test está en UTC: el "hoy" de la app
// tiene que seguir siendo el 13 (contrato de US-23, 11.7 y 11.14)
const NOW = new Date('2026-11-13T19:30:00Z')
const TODAY = '2026-11-13'

const POLLO = '00000000-0000-4000-8000-000000000002'
const ARROZ = '00000000-0000-4000-8000-000000000003'
const MANZANA = '00000000-0000-4000-8000-000000000004'

type FoodJson = {
  id: string
  name: string
  referencePortionG: number
  caloriesKcal: number
  proteinG: number
  carbsG: number
  fatG: number
}

// catálogo de prueba con los valores por 100 g del contrato (V9)
const foods: FoodJson[] = [
  {
    id: POLLO,
    name: 'Pechuga de pollo cocida',
    referencePortionG: 100,
    caloriesKcal: 165,
    proteinG: 31,
    carbsG: 0,
    fatG: 3.6,
  },
  {
    id: ARROZ,
    name: 'Arroz blanco cocido',
    referencePortionG: 100,
    caloriesKcal: 130,
    proteinG: 2.7,
    carbsG: 28,
    fatG: 0.3,
  },
  {
    id: MANZANA,
    name: 'Manzana',
    referencePortionG: 100,
    caloriesKcal: 52,
    proteinG: 0.3,
    carbsG: 14,
    fatG: 0.2,
  },
]

type MealItemJson = {
  id: string
  foodId: string
  foodName: string
  quantityG: number
  caloriesKcal: number
  proteinG: number
  carbsG: number
  fatG: number
}

type MealJson = {
  id: string
  date: string
  type: string
  description: string | null
  totalCaloriesKcal: number | null
  items: MealItemJson[]
  createdAt: string
  updatedAt: string
}

const round2 = (value: number) => Math.round(value * 100) / 100

// valores de un ítem igual que el backend: cantidad × referencia / porción de referencia
const itemFor = (
  id: number,
  foodId: string,
  quantityG: number,
): MealItemJson => {
  const food = foods.find((f) => f.id === foodId)!
  const ratio = quantityG / food.referencePortionG
  return {
    id: `10000000-0000-4000-8000-${String(id).padStart(12, '0')}`,
    foodId,
    foodName: food.name,
    quantityG,
    caloriesKcal: round2(food.caloriesKcal * ratio),
    proteinG: round2(food.proteinG * ratio),
    carbsG: round2(food.carbsG * ratio),
    fatG: round2(food.fatG * ratio),
  }
}

const lunch = (): MealJson => ({
  id: '20000000-0000-4000-8000-000000000001',
  date: TODAY,
  type: 'LUNCH',
  description: null,
  totalCaloriesKcal: 507.5,
  items: [itemFor(1, POLLO, 150), itemFor(2, ARROZ, 200)],
  createdAt: '2026-11-13T16:40:12Z',
  updatedAt: '2026-11-13T16:40:12Z',
})

const snack = (): MealJson => ({
  id: '20000000-0000-4000-8000-000000000002',
  date: TODAY,
  type: 'SNACK',
  description: 'Una banana',
  totalCaloriesKcal: null,
  items: [],
  createdAt: '2026-11-13T18:05:00Z',
  updatedAt: '2026-11-13T18:05:00Z',
})

// imita al backend de US-23 en memoria: listado por día, alta, edición y borrado de la comida
// (con ítems y calorías calculadas) y buscador del catálogo por nombre
const routeBackend = async (
  page: Page,
  initial: MealJson[] = [lunch(), snack()],
) => {
  let meals = initial
  let nextId = 100
  const requests: Request[] = []
  const pathOf = (request: Request) =>
    new URL(request.url()).pathname.replace('/api', '')
  const notAllowed = (path: string) =>
    apiError(403, 'No tiene permisos para acceder a este atleta', path)

  await page.route(FOODS_URL, (route) => {
    const params = new URL(route.request().url()).searchParams
    const name = (params.get('name') ?? '').toLowerCase()
    const matching = foods
      .filter((f) => f.name.toLowerCase().includes(name))
      .sort((a, b) => a.name.localeCompare(b.name))
    return route.fulfill({
      status: 200,
      json: {
        content: matching,
        page: 0,
        size: Number(params.get('size') ?? 20),
        totalElements: matching.length,
        totalPages: matching.length > 0 ? 1 : 0,
      },
    })
  })

  await page.route(MEALS_URL, (route) => {
    const request = route.request()
    requests.push(request)
    const path = pathOf(request)
    if (!path.startsWith(`/athletes/${athlete.id}/`)) {
      return route.fulfill(notAllowed(path))
    }

    if (request.method() === 'POST') {
      const body = request.postDataJSON() as {
        date: string
        type: string
        description: string | null
        items: { foodId: string; quantityG: number }[]
      }
      const items = body.items.map((item, index) =>
        itemFor(nextId * 10 + index, item.foodId, item.quantityG),
      )
      const total =
        items.length > 0
          ? round2(items.reduce((sum, item) => sum + item.caloriesKcal, 0))
          : null
      const created: MealJson = {
        id: `20000000-0000-4000-8000-${String(nextId++).padStart(12, '0')}`,
        date: body.date,
        type: body.type,
        description: body.description,
        totalCaloriesKcal: total,
        items,
        createdAt: '2026-11-13T19:31:00Z',
        updatedAt: '2026-11-13T19:31:00Z',
      }
      meals = [...meals, created]
      return route.fulfill({ status: 201, json: created })
    }

    // listado del día: el front siempre manda la fecha
    const date = new URL(request.url()).searchParams.get('date')
    return route.fulfill({
      status: 200,
      json: meals.filter((meal) => meal.date === date),
    })
  })

  // US-24: resumen del día, sumado de los ítems ya redondeados; las comidas sin ítems no suman
  // y se cuentan aparte. No se registra en `requests`: el orden de los pedidos no debe cambiar
  await page.route(SUMMARY_URL, (route) => {
    const request = route.request()
    const path = pathOf(request)
    if (!path.startsWith(`/athletes/${athlete.id}/`)) {
      return route.fulfill(notAllowed(path))
    }
    const date = new URL(request.url()).searchParams.get('date')
    const ofDay = meals.filter((meal) => meal.date === date)
    const withItems = ofDay.filter((meal) => meal.items.length > 0)
    const sum = (pick: (item: MealItemJson) => number) =>
      round2(
        withItems
          .flatMap((meal) => meal.items)
          .reduce((total, item) => total + pick(item), 0),
      )
    return route.fulfill({
      status: 200,
      json: {
        date,
        caloriesKcal: sum((item) => item.caloriesKcal),
        proteinG: sum((item) => item.proteinG),
        carbsG: sum((item) => item.carbsG),
        fatG: sum((item) => item.fatG),
        mealCount: ofDay.length,
        mealsWithoutNutrition: ofDay.length - withItems.length,
      },
    })
  })

  await page.route(MEAL_URL, (route) => {
    const request = route.request()
    requests.push(request)
    const path = pathOf(request)
    const id = path.split('/').at(-1)
    const meal = meals.find((m) => m.id === id)
    if (!meal) {
      return route.fulfill(
        apiError(404, `No existe la comida con id ${id}`, path),
      )
    }

    if (request.method() === 'DELETE') {
      meals = meals.filter((m) => m.id !== id)
      return route.fulfill({ status: 204 })
    }

    // PUT: edición completa; los ítems cambian de id
    const body = request.postDataJSON() as {
      date: string
      type: string
      description: string | null
      items: { foodId: string; quantityG: number }[]
    }
    const items = body.items.map((item, index) =>
      itemFor(nextId * 10 + index, item.foodId, item.quantityG),
    )
    const updated: MealJson = {
      ...meal,
      date: body.date,
      type: body.type,
      description: body.description,
      items,
      totalCaloriesKcal:
        items.length > 0
          ? round2(items.reduce((sum, item) => sum + item.caloriesKcal, 0))
          : null,
      updatedAt: '2026-11-13T19:35:00Z',
    }
    nextId++
    meals = meals.map((m) => (m.id === id ? updated : m))
    return route.fulfill({ status: 200, json: updated })
  })

  return requests
}

const paramsOf = (request: Request) =>
  Object.fromEntries(new URL(request.url()).searchParams)

const bodyOf = (requests: Request[], method: string) =>
  requests.find((r) => r.method() === method)?.postDataJSON()

// solo las comidas: la lista de alimentos de cada comida también tiene li, pero no es hija directa
const listItems = (page: Page) =>
  page.getByRole('list', { name: 'Comidas de hoy' }).locator('xpath=./li')

const searchBox = (page: Page) =>
  page.getByRole('searchbox', { name: 'Buscar alimento' })

// el tipo de comida se elige tocando la etiqueta del chip (como lo haría el atleta)
const pickType = async (page: Page, name: string) => {
  await page
    .locator('label', { has: page.getByRole('radio', { name }) })
    .click()
}

// la página está lista cuando se ve el encabezado del día
const openMeals = async (page: Page) => {
  await page.goto(paths.meals)
  await expect(
    page.getByRole('heading', { name: 'Comidas', level: 1 }),
  ).toBeVisible()
  // el encabezado de la lista siempre está; la lista o su estado vacío llegan después
  await expect(
    page.getByRole('heading', { name: 'Comidas de hoy', level: 2 }),
  ).toBeVisible()
}

test.describe('como atleta', () => {
  test.use({ timezoneId: 'UTC' })

  test.beforeEach(async ({ page }) => {
    await page.clock.setFixedTime(NOW)
    await seedSession(page, athlete, 'access-1')
    await routeCurrentUser(page, athlete)
  })

  test('entra a Comidas desde el menú y ve las de hoy con sus calorías', async ({
    page,
  }) => {
    const requests = await routeBackend(page)
    await page.goto(paths.dashboard)

    await page
      .getByRole('navigation', { name: 'Principal' })
      .getByRole('link', { name: 'Comidas' })
      .click()

    await expect(page).toHaveURL(paths.meals)
    await expect(
      page.getByRole('navigation', { name: 'Ubicación' }),
    ).toContainText('Comidas')
    await expect(listItems(page)).toHaveCount(2)
    await expect(listItems(page).first()).toContainText('Almuerzo')
    await expect(listItems(page).first()).toContainText('507,5 kcal')
    await expect(listItems(page).first()).toContainText(
      'Pechuga de pollo cocida · 150 g · 247,5 kcal',
    )
    // una comida solo con descripción no tiene calorías: guion, no 0
    await expect(listItems(page).last()).toContainText('Una banana')
    await expect(listItems(page).last()).toContainText(
      'Sin calorías calculadas',
    )
    await expect(listItems(page).last()).not.toContainText('0 kcal')

    const list = requests.find((r) => r.method() === 'GET')!
    expect(new URL(list.url()).pathname).toBe(
      `/api/athletes/${athlete.id}/meals`,
    )
    expect(paramsOf(list)).toEqual({ date: TODAY })
    expect(list.headers().authorization).toBe('Bearer access-1')
  })

  test('sin comidas hoy muestra el estado vacío', async ({ page }) => {
    await routeBackend(page, [])

    await openMeals(page)

    await expect(
      page.getByText('Todavía no registraste comidas hoy'),
    ).toBeVisible()
  })

  test('registra un almuerzo con alimentos y ve sus calorías en la lista', async ({
    page,
  }) => {
    const requests = await routeBackend(page, [])
    await openMeals(page)

    await pickType(page, 'Almuerzo')
    await searchBox(page).fill('pollo')
    await page
      .getByRole('button', { name: 'Agregar Pechuga de pollo cocida' })
      .click()
    await page
      .getByRole('spinbutton', { name: /Cantidad de Pechuga de pollo cocida/ })
      .fill('150')
    await searchBox(page).fill('arroz')
    await page
      .getByRole('button', { name: 'Agregar Arroz blanco cocido' })
      .click()
    // el arroz arranca con su porción de referencia (100 g): se deja así
    await expect(
      page.getByRole('spinbutton', { name: /Cantidad de Arroz blanco cocido/ }),
    ).toHaveValue('100')

    await page.getByRole('button', { name: 'Registrar comida' }).click()

    await expect(
      page
        .getByRole('status')
        .filter({ hasText: 'Registraste almuerzo de hoy.' }),
    ).toBeVisible()
    expect(bodyOf(requests, 'POST')).toEqual({
      date: TODAY,
      type: 'LUNCH',
      description: null,
      items: [
        { foodId: POLLO, quantityG: 150 },
        { foodId: ARROZ, quantityG: 100 },
      ],
    })
    await expect(listItems(page)).toHaveCount(1)
    await expect(listItems(page).first()).toContainText('Almuerzo')
    // 247,5 del pollo + 130 del arroz
    await expect(listItems(page).first()).toContainText('377,5 kcal')
    // el formulario queda listo para otra comida, en el alta
    await expect(
      page.getByRole('heading', { name: 'Registrar comida' }),
    ).toBeVisible()
  })

  test('registra una comida solo con descripción', async ({ page }) => {
    const requests = await routeBackend(page, [])
    await openMeals(page)

    await pickType(page, 'Merienda')
    await page
      .getByRole('textbox', { name: 'Descripción' })
      .fill('  Yogur natural  ')
    await page.getByRole('button', { name: 'Registrar comida' }).click()

    await expect(listItems(page)).toHaveCount(1)
    await expect(listItems(page).first()).toContainText('Yogur natural')
    await expect(listItems(page).first()).toContainText(
      'Sin calorías calculadas',
    )
    expect(bodyOf(requests, 'POST')).toEqual({
      date: TODAY,
      type: 'SNACK',
      description: 'Yogur natural',
      items: [],
    })
  })

  test('sin descripción ni alimentos no envía y avisa en el bloque de alimentos', async ({
    page,
  }) => {
    const requests = await routeBackend(page, [])
    await openMeals(page)

    await page.getByRole('button', { name: 'Registrar comida' }).click()

    await expect(
      page.getByText('Cargá una descripción o al menos un alimento'),
    ).toBeVisible()
    await expect(searchBox(page)).toBeFocused()
    expect(requests.some((r) => r.method() === 'POST')).toBe(false)
  })

  test('edita una comida desde la lista y la guarda con su fecha', async ({
    page,
  }) => {
    const requests = await routeBackend(page)
    await openMeals(page)

    await page.getByRole('button', { name: /Editar Almuerzo/ }).click()

    await expect(
      page.getByRole('heading', { name: 'Editar comida' }),
    ).toBeFocused()
    await expect(page.getByRole('radio', { name: 'Almuerzo' })).toBeChecked()
    await page.getByRole('textbox', { name: 'Descripción' }).fill('Con limón')
    await page.getByRole('button', { name: 'Guardar cambios' }).click()

    await expect(
      page.getByRole('status').filter({
        hasText: 'Guardaste los cambios de almuerzo.',
      }),
    ).toBeVisible()
    expect(bodyOf(requests, 'PUT')).toEqual({
      date: TODAY,
      type: 'LUNCH',
      description: 'Con limón',
      items: [
        { foodId: POLLO, quantityG: 150 },
        { foodId: ARROZ, quantityG: 200 },
      ],
    })
    await expect(listItems(page).first()).toContainText('Con limón')
  })

  test('borra una comida después de confirmar', async ({ page }) => {
    const requests = await routeBackend(page)
    await openMeals(page)

    await page.getByRole('button', { name: /Borrar Merienda/ }).click()
    const dialog = page.getByRole('dialog')
    await expect(
      dialog.getByRole('heading', { name: '¿Borrar la comida de merienda?' }),
    ).toBeVisible()
    await dialog.getByRole('button', { name: 'Borrar', exact: true }).click()

    await expect(
      page.getByRole('status').filter({ hasText: 'Borraste merienda de hoy.' }),
    ).toBeVisible()
    await expect(listItems(page)).toHaveCount(1)
    const deleted = requests.find((r) => r.method() === 'DELETE')!
    expect(new URL(deleted.url()).pathname).toBe(
      `/api/athletes/${athlete.id}/meals/20000000-0000-4000-8000-000000000002`,
    )
  })

  test('ante un error del servidor muestra Reintentar y vuelve a pedir el día', async ({
    page,
  }) => {
    await routeBackend(page)
    // TanStack reintenta una vez los 5xx: fallan los dos primeros pedidos y después responde el backend
    let failures = 2
    await page.route(MEALS_URL, (route) => {
      if (route.request().method() === 'GET' && failures-- > 0) {
        return route.fulfill(
          apiError(
            500,
            'Ocurrió un error inesperado. Intente nuevamente más tarde',
            '/meals',
          ),
        )
      }
      return route.fallback()
    })

    await page.goto(paths.meals)
    await expect(
      page.getByText(
        'Ocurrió un error inesperado. Intente nuevamente más tarde',
      ),
    ).toBeVisible()
    await page.getByRole('button', { name: 'Reintentar' }).click()

    await expect(listItems(page)).toHaveCount(2)
  })
})

test.describe('en un celular', () => {
  test.use({
    timezoneId: 'UTC',
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  })

  test.beforeEach(async ({ page }) => {
    await page.clock.setFixedTime(NOW)
    await seedSession(page, athlete, 'access-1')
    await routeCurrentUser(page, athlete)
  })

  test('registra una comida con pocos toques y sin scroll horizontal', async ({
    page,
  }) => {
    const requests = await routeBackend(page, [])
    await openMeals(page)

    // el tipo de comida ya viene sugerido por la hora (16:30 en Argentina: merienda)
    await expect(page.getByRole('radio', { name: 'Merienda' })).toBeChecked()
    await page.getByRole('textbox', { name: 'Descripción' }).fill('Banana')
    await page.getByRole('button', { name: 'Registrar comida' }).tap()

    await expect(listItems(page)).toHaveCount(1)
    expect(bodyOf(requests, 'POST')).toEqual({
      date: TODAY,
      type: 'SNACK',
      description: 'Banana',
      items: [],
    })

    const overflow = await page.evaluate(
      'document.documentElement.scrollWidth - window.innerWidth',
    )
    expect(overflow).toBeLessThanOrEqual(0)
  })

  test('busca y agrega alimentos sin que el teclado envíe la comida', async ({
    page,
  }) => {
    const requests = await routeBackend(page, [])
    await openMeals(page)

    await searchBox(page).fill('manzana')
    await page.getByRole('button', { name: 'Agregar Manzana' }).tap()
    await expect(
      page.getByRole('spinbutton', { name: /Cantidad de Manzana/ }),
    ).toBeVisible()
    await expect(
      page.getByRole('spinbutton', { name: /Cantidad de Manzana/ }),
    ).toHaveValue('100')
    // Enter en el buscador no envía: sigue sin pedidos POST
    await searchBox(page).press('Enter')
    expect(requests.some((r) => r.method() === 'POST')).toBe(false)

    const overflow = await page.evaluate(
      'document.documentElement.scrollWidth - window.innerWidth',
    )
    expect(overflow).toBeLessThanOrEqual(0)
  })
})

// rol: un entrenador no tiene Comidas en su menú ni puede entrar a la ruta
test.describe('como entrenador', () => {
  test('no ve Comidas en el menú', async ({ page }) => {
    await seedSession(page, coach, 'access-1')
    await routeCurrentUser(page, coach)
    await page.goto(paths.dashboard)

    await expect(
      page.getByRole('navigation', { name: 'Principal' }),
    ).toBeVisible()
    await expect(
      page
        .getByRole('navigation', { name: 'Principal' })
        .getByRole('link', { name: 'Comidas' }),
    ).toHaveCount(0)
  })
})
