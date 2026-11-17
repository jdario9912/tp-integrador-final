import { expect, test, type Page, type Request } from '@playwright/test'
import { paths } from '../src/router/paths.ts'
import {
  apiError,
  athlete,
  routeCurrentUser,
  seedSession,
} from './auth-helpers.ts'

// US-24: resumen nutricional del día y navegación por días en /meals (la API se intercepta)
// comidas (GET con ?date=, POST, PUT, DELETE), resumen del día y comidas de un solo atleta
const MEALS_URL = /\/api\/athletes\/[^/]+\/meals(\?.*)?$/
const SUMMARY_URL = /\/api\/athletes\/[^/]+\/meals\/summary(\?.*)?$/
// el formulario de comidas busca alimentos al abrir: sin catálogo en este spec
const FOODS_URL = /\/api\/foods(\?.*)?$/

// 16:30 del 13/11 en Argentina. El navegador del test está en UTC: el "hoy" de la app es el 13
const NOW = new Date('2026-11-13T19:30:00Z')
const TODAY = '2026-11-13'
const YESTERDAY = '2026-11-12'
const EMPTY_DAY = '2026-11-11'

const POLLO = '00000000-0000-4000-8000-000000000002'
const ARROZ = '00000000-0000-4000-8000-000000000003'

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

// pechuga de pollo: 150 g (valores de la porción de referencia de 100 g, ya multiplicados)
const pollo150: MealItemJson = {
  id: '40000000-0000-4000-8000-000000000001',
  foodId: POLLO,
  foodName: 'Pechuga de pollo cocida',
  quantityG: 150,
  caloriesKcal: 247.5,
  proteinG: 46.5,
  carbsG: 0,
  fatG: 5.4,
}

// arroz blanco cocido: 200 g
const arroz200: MealItemJson = {
  id: '40000000-0000-4000-8000-000000000002',
  foodId: ARROZ,
  foodName: 'Arroz blanco cocido',
  quantityG: 200,
  caloriesKcal: 260,
  proteinG: 5.4,
  carbsG: 56,
  fatG: 0.6,
}

const almuerzoHoy = (): MealJson => ({
  id: '50000000-0000-4000-8000-000000000001',
  date: TODAY,
  type: 'LUNCH',
  description: null,
  totalCaloriesKcal: 247.5,
  items: [pollo150],
  createdAt: '2026-11-13T16:40:12Z',
  updatedAt: '2026-11-13T16:40:12Z',
})

// sin ítems: no tiene datos nutricionales y no entra en el total del día
const bananaHoy = (): MealJson => ({
  id: '50000000-0000-4000-8000-000000000002',
  date: TODAY,
  type: 'SNACK',
  description: 'Una banana',
  totalCaloriesKcal: null,
  items: [],
  createdAt: '2026-11-13T18:05:00Z',
  updatedAt: '2026-11-13T18:05:00Z',
})

const cenaAyer = (): MealJson => ({
  id: '50000000-0000-4000-8000-000000000003',
  date: YESTERDAY,
  type: 'DINNER',
  description: null,
  totalCaloriesKcal: 260,
  items: [arroz200],
  createdAt: '2026-11-12T21:10:00Z',
  updatedAt: '2026-11-12T21:10:00Z',
})

// imita al backend de US-23 y US-24 en memoria: listado por día, alta (solo descripción),
// borrado y resumen del día calculado con las mismas reglas que el backend
const routeBackend = async (page: Page, initial: MealJson[]) => {
  let meals = initial
  let nextId = 100
  const requests: Request[] = []
  const summaryRequests: Request[] = []
  const pathOf = (request: Request) =>
    new URL(request.url()).pathname.replace('/api', '')
  const notAllowed = (path: string) =>
    apiError(403, 'No tiene permisos para acceder a este atleta', path)

  await page.route(FOODS_URL, (route) =>
    route.fulfill({
      status: 200,
      json: { content: [], page: 0, size: 20, totalElements: 0, totalPages: 0 },
    }),
  )

  await page.route(SUMMARY_URL, (route) => {
    const request = route.request()
    summaryRequests.push(request)
    const path = pathOf(request)
    if (!path.startsWith(`/athletes/${athlete.id}/`)) {
      return route.fulfill(notAllowed(path))
    }
    const date = new URL(request.url()).searchParams.get('date')
    const ofDay = meals.filter((meal) => meal.date === date)
    // las comidas sin ítems no suman: se cuentan aparte
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
        items: unknown[]
      }
      const created: MealJson = {
        id: `50000000-0000-4000-8000-${String(nextId++).padStart(12, '0')}`,
        date: body.date,
        type: body.type,
        description: body.description,
        totalCaloriesKcal: null,
        items: [],
        createdAt: '2026-11-13T19:31:00Z',
        updatedAt: '2026-11-13T19:31:00Z',
      }
      meals = [...meals, created]
      return route.fulfill({ status: 201, json: created })
    }

    const date = new URL(request.url()).searchParams.get('date')
    return route.fulfill({
      status: 200,
      json: meals.filter((meal) => meal.date === date),
    })
  })

  return { requests, summaryRequests }
}

const paramsOf = (request: Request) =>
  Object.fromEntries(new URL(request.url()).searchParams)

// la página de un día está lista cuando se ve su encabezado
const expectDayTitle = async (page: Page, name: string) =>
  expect(page.getByRole('heading', { name, level: 2 })).toBeVisible()

// el resumen del día es una región con nombre: todas sus cifras se buscan dentro de ella
const summaryCard = (page: Page) =>
  page.getByRole('region', { name: 'Resumen del día' })

// solo las comidas: la lista de alimentos de cada comida también tiene li, pero no es hija directa
const listItems = (page: Page, name: string) =>
  page.getByRole('list', { name }).locator('xpath=./li')

const pickType = async (page: Page, name: string) => {
  await page
    .locator('label', { has: page.getByRole('radio', { name }) })
    .click()
}

test.describe('como atleta', () => {
  test.use({ timezoneId: 'UTC' })

  test.beforeEach(async ({ page }) => {
    await page.clock.setFixedTime(NOW)
    await seedSession(page, athlete, 'access-1')
    await routeCurrentUser(page, athlete)
  })

  test('hoy muestra el resumen del día con el aviso de comidas sin datos', async ({
    page,
  }) => {
    await routeBackend(page, [almuerzoHoy(), bananaHoy()])

    await page.goto(paths.meals)

    await expectDayTitle(page, 'Comidas de hoy')
    await expect(
      summaryCard(page).getByText('247,5 kcal', { exact: true }),
    ).toBeVisible()
    await expect(
      summaryCard(page).getByText('2 comidas registradas'),
    ).toBeVisible()
    // la banana no tiene calorías: el aviso dice que no entra en el total
    await expect(
      page.getByRole('note').filter({
        hasText: '1 comida sin datos nutricionales no se cuenta en el total.',
      }),
    ).toBeVisible()
    // hoy no se puede ir al día siguiente
    await expect(
      page.getByRole('button', { name: 'Día siguiente' }),
    ).toBeDisabled()
  })

  test('navega al día anterior: cambia la URL, la lista y el resumen', async ({
    page,
  }) => {
    const { requests, summaryRequests } = await routeBackend(page, [
      almuerzoHoy(),
      cenaAyer(),
    ])
    await page.goto(paths.meals)
    await expectDayTitle(page, 'Comidas de hoy')

    await page.getByRole('button', { name: 'Día anterior' }).click()

    await expect(page).toHaveURL(`${paths.meals}?date=${YESTERDAY}`)
    await expectDayTitle(page, 'Comidas del día')
    await expect(page.locator(`time[datetime="${YESTERDAY}"]`)).toHaveText(
      '12 de noviembre de 2026',
    )
    await expect(listItems(page, 'Comidas del día')).toHaveCount(1)
    await expect(listItems(page, 'Comidas del día').first()).toContainText(
      'Arroz blanco cocido · 200 g · 260 kcal',
    )
    await expect(
      summaryCard(page).getByText('260 kcal', { exact: true }),
    ).toBeVisible()
    await expect(
      summaryCard(page).getByText('1 comida registrada'),
    ).toBeVisible()
    // ningún aviso: todas las comidas del día tienen datos nutricionales
    await expect(page.getByRole('note')).toHaveCount(0)

    // la lista y el resumen piden ese día, nunca el de hoy
    const listRequest = requests.find(
      (r) => r.method() === 'GET' && paramsOf(r).date === YESTERDAY,
    )
    expect(listRequest).toBeDefined()
    expect(paramsOf(listRequest!)).toEqual({ date: YESTERDAY })
    const summaryForDay = summaryRequests.find(
      (r) => paramsOf(r).date === YESTERDAY,
    )
    expect(summaryForDay).toBeDefined()
    expect(paramsOf(summaryForDay!)).toEqual({ date: YESTERDAY })
  })

  test('"Volver a hoy" quita la fecha de la URL y "Día siguiente" vuelve a quedar deshabilitado', async ({
    page,
  }) => {
    await routeBackend(page, [almuerzoHoy(), cenaAyer()])
    await page.goto(`${paths.meals}?date=${YESTERDAY}`)
    await expectDayTitle(page, 'Comidas del día')

    await page.getByRole('button', { name: 'Volver a hoy' }).click()

    await expectDayTitle(page, 'Comidas de hoy')
    await expect(page).toHaveURL(paths.meals)
    await expect(
      page.getByRole('button', { name: 'Día siguiente' }),
    ).toBeDisabled()
  })

  test('una fecha inválida o futura en la URL muestra hoy y corrige la URL', async ({
    page,
  }) => {
    await routeBackend(page, [almuerzoHoy()])

    await page.goto(`${paths.meals}?date=2026-02-31`)
    await expectDayTitle(page, 'Comidas de hoy')
    await expect(page).toHaveURL(paths.meals)

    await page.goto(`${paths.meals}?date=2026-11-20`)
    await expectDayTitle(page, 'Comidas de hoy')
    await expect(page).toHaveURL(paths.meals)
  })

  test('un día sin comidas muestra totales en cero y el estado vacío', async ({
    page,
  }) => {
    await routeBackend(page, [almuerzoHoy()])

    await page.goto(`${paths.meals}?date=${EMPTY_DAY}`)

    await expectDayTitle(page, 'Comidas del día')
    await expect(
      summaryCard(page).getByText('0 kcal', { exact: true }),
    ).toBeVisible()
    await expect(summaryCard(page).getByText('0 g')).toHaveCount(3)
    await expect(
      summaryCard(page).getByText('Sin comidas registradas este día'),
    ).toBeVisible()
    await expect(page.getByText('No registraste comidas ese día')).toBeVisible()
    await expect(page.getByRole('note')).toHaveCount(0)
  })

  test('registra una merienda en un día anterior y el resumen se actualiza', async ({
    page,
  }) => {
    const { requests } = await routeBackend(page, [cenaAyer()])
    await page.goto(`${paths.meals}?date=${YESTERDAY}`)
    await expect(
      summaryCard(page).getByText('1 comida registrada'),
    ).toBeVisible()

    await pickType(page, 'Merienda')
    await page
      .getByRole('textbox', { name: 'Descripción' })
      .fill('Yogur natural')
    await page.getByRole('button', { name: 'Registrar comida' }).click()

    await expect(
      page.getByRole('status').filter({
        hasText: 'Registraste merienda del 12 de noviembre de 2026.',
      }),
    ).toBeVisible()
    const created = requests.find((r) => r.method() === 'POST')!
    expect(created.postDataJSON()).toEqual({
      date: YESTERDAY,
      type: 'SNACK',
      description: 'Yogur natural',
      items: [],
    })
    // el resumen y la lista se vuelven a pedir: ahora hay dos comidas ese día
    await expect(
      summaryCard(page).getByText('2 comidas registradas'),
    ).toBeVisible()
    await expect(listItems(page, 'Comidas del día')).toHaveCount(2)
    // la banana (sin ítems) no cambia el total: el aviso aparece
    await expect(
      page.getByRole('note').filter({
        hasText: '1 comida sin datos nutricionales no se cuenta en el total.',
      }),
    ).toBeVisible()
  })

  test('si el resumen falla, Reintentar lo vuelve a pedir sin tocar la lista', async ({
    page,
  }) => {
    await routeBackend(page, [almuerzoHoy()])
    // TanStack reintenta una vez los 5xx: fallan los dos primeros pedidos del resumen
    let failures = 2
    await page.route(SUMMARY_URL, (route) => {
      if (failures-- > 0) {
        return route.fulfill(
          apiError(
            500,
            'No pudimos calcular el resumen del día',
            '/meals/summary',
          ),
        )
      }
      return route.fallback()
    })

    await page.goto(paths.meals)

    await expect(
      summaryCard(page).getByText('No pudimos calcular el resumen del día'),
    ).toBeVisible()
    // la lista del día carga aparte y sigue visible
    await expect(listItems(page, 'Comidas de hoy')).toHaveCount(1)

    await summaryCard(page).getByRole('button', { name: 'Reintentar' }).click()

    await expect(
      summaryCard(page).getByText('247,5 kcal', { exact: true }),
    ).toBeVisible()
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

  test('navega entre días y ve el resumen sin scroll horizontal', async ({
    page,
  }) => {
    await routeBackend(page, [almuerzoHoy(), cenaAyer()])
    await page.goto(paths.meals)
    await expectDayTitle(page, 'Comidas de hoy')

    await page.getByRole('button', { name: 'Día anterior' }).tap()

    await expect(page).toHaveURL(`${paths.meals}?date=${YESTERDAY}`)
    await expect(
      summaryCard(page).getByText('260 kcal', { exact: true }),
    ).toBeVisible()

    const overflow = await page.evaluate(
      'document.documentElement.scrollWidth - window.innerWidth',
    )
    expect(overflow).toBeLessThanOrEqual(0)
  })
})
