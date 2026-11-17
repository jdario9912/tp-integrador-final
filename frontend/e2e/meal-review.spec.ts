import { expect, test, type Page, type Request } from '@playwright/test'
import { athleteProfilePath, paths } from '../src/router/paths.ts'
import {
  apiError,
  athlete,
  coach,
  routeCurrentUser,
  seedSession,
} from './auth-helpers.ts'

// US-25: alimentación del atleta para su entrenador (semana y día) y revisión de comidas. La API va
// interceptada: las comidas viven en un arreglo y cada pedido responde desde ahí, como el backend

const OVERVIEW_URL = /\/api\/athletes\/[^/]+\/meals\/overview(\?.*)?$/
const SUMMARY_URL = /\/api\/athletes\/[^/]+\/meals\/summary(\?.*)?$/
const MEALS_URL = /\/api\/athletes\/[^/]+\/meals(\?.*)?$/
const REVIEW_URL = /\/api\/athletes\/[^/]+\/meals\/([^/]+)\/review$/
// ficha del atleta (US-09, US-16, US-21, US-26): se muestra junto a la alimentación
const ATHLETE_URL = /\/api\/athletes\/[^/?]+$/
const WEIGHTS_URL = /\/api\/athletes\/[^/]+\/weights(\?.*)?$/
const ASSIGNMENTS_URL = /\/api\/athletes\/[^/]+\/assignments(\?.*)?$/
const SESSIONS_URL = /\/api\/athletes\/[^/]+\/sessions(\?.*)?$/
// el formulario de comidas del atleta busca alimentos al abrir: sin catálogo en este spec
const FOODS_URL = /\/api\/foods(\?.*)?$/

// 16:30 del 17/11 en Argentina. El navegador del test está en UTC: el "hoy" de la app es el 17
const NOW = new Date('2026-11-17T19:30:00Z')
const TODAY = '2026-11-17'
const MEAL_DAY = '2026-11-13'

type MealJson = {
  id: string
  date: string
  type: string
  description: string | null
  totalCaloriesKcal: number | null
  items: {
    id: string
    foodId: string
    foodName: string
    quantityG: number
    caloriesKcal: number
    proteinG: number
    carbsG: number
    fatG: number
  }[]
  review: { reviewedAt: string; observation: string | null } | null
  createdAt: string
  updatedAt: string
}

const almuerzo = (): MealJson => ({
  id: '7d8e9f0a-1b2c-4d3e-8f4a-5b6c7d8e9f0a',
  date: MEAL_DAY,
  type: 'LUNCH',
  description: null,
  totalCaloriesKcal: 247.5,
  items: [
    {
      id: 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d',
      foodId: '0b1c2d3e-4f5a-4b6c-9d7e-8f9a0b1c2d3e',
      foodName: 'Pechuga de pollo cocida',
      quantityG: 150,
      caloriesKcal: 247.5,
      proteinG: 46.5,
      carbsG: 0,
      fatG: 5.4,
    },
  ],
  review: null,
  createdAt: '2026-11-13T16:40:12.345678Z',
  updatedAt: '2026-11-13T16:40:12.345678Z',
})

const banana = (): MealJson => ({
  id: '8e9f0a1b-2c3d-4e4f-9a5b-6c7d8e9f0a1b',
  date: MEAL_DAY,
  type: 'SNACK',
  description: 'Una banana',
  totalCaloriesKcal: null,
  items: [],
  review: null,
  createdAt: '2026-11-13T19:10:00.000000Z',
  updatedAt: '2026-11-13T19:10:00.000000Z',
})

const shiftDay = (date: string, days: number) => {
  const [year, month, day] = date.split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, day + days))
    .toISOString()
    .slice(0, 10)
}

const daySummary = (meals: MealJson[], date: string) => {
  const ofDay = meals.filter((meal) => meal.date === date)
  const items = ofDay.flatMap((meal) => meal.items)
  const sum = (key: 'caloriesKcal' | 'proteinG' | 'carbsG' | 'fatG') =>
    Math.round(items.reduce((total, item) => total + item[key], 0) * 100) / 100
  return {
    date,
    caloriesKcal: sum('caloriesKcal'),
    proteinG: sum('proteinG'),
    carbsG: sum('carbsG'),
    fatG: sum('fatG'),
    mealCount: ofDay.length,
    mealsWithoutNutrition: ofDay.filter((meal) => meal.items.length === 0)
      .length,
  }
}

// overview, resumen, comidas del día y revisión, desde el mismo arreglo de comidas
const routeMealsApi = async (
  page: Page,
  meals: MealJson[],
  { overviewStatus = 200 }: { overviewStatus?: number } = {},
) => {
  const reviews: Request[] = []
  const overviews: Request[] = []

  await page.route(OVERVIEW_URL, (route) => {
    overviews.push(route.request())
    const url = new URL(route.request().url())
    if (overviewStatus === 403) {
      return route.fulfill(
        apiError(403, 'No tenés acceso a este atleta', url.pathname),
      )
    }
    const from = url.searchParams.get('from') ?? shiftDay(TODAY, -6)
    const to = url.searchParams.get('to') ?? TODAY
    const days = []
    for (let date = from; date <= to; date = shiftDay(date, 1)) {
      days.push(daySummary(meals, date))
    }
    return route.fulfill({
      status: 200,
      json: {
        from,
        to,
        totalDays: days.length,
        daysWithMeals: days.filter((day) => day.mealCount > 0).length,
        days,
      },
    })
  })

  await page.route(SUMMARY_URL, (route) => {
    const date = new URL(route.request().url()).searchParams.get('date') ?? ''
    return route.fulfill({ status: 200, json: daySummary(meals, date) })
  })

  await page.route(MEALS_URL, (route) => {
    if (route.request().method() !== 'GET') return route.fallback()
    const date = new URL(route.request().url()).searchParams.get('date')
    return route.fulfill({
      status: 200,
      json: meals.filter((meal) => meal.date === date),
    })
  })

  await page.route(REVIEW_URL, (route) => {
    if (route.request().method() !== 'PUT') return route.fallback()
    reviews.push(route.request())
    const mealId = REVIEW_URL.exec(route.request().url())?.[1]
    const target = meals.find((meal) => meal.id === mealId)
    if (!target) {
      return route.fulfill(apiError(404, 'La comida no existe', '/review'))
    }
    const body = (route.request().postDataJSON() ?? {}) as {
      observation?: string
    }
    target.review = {
      reviewedAt: NOW.toISOString(),
      observation: body.observation ?? null,
    }
    return route.fulfill({ status: 200, json: target })
  })

  return { reviews, overviews }
}

// la ficha del atleta: datos mínimos, sin pesos, asignaciones ni entrenamientos
const routeAthleteProfile = async (page: Page) => {
  await page.route(ATHLETE_URL, (route) =>
    route.fulfill({
      status: 200,
      json: {
        id: athlete.id,
        coachId: coach.id,
        firstName: athlete.firstName,
        lastName: athlete.lastName,
        email: athlete.email,
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
      },
    }),
  )
  const emptyPage = {
    content: [],
    page: 0,
    size: 10,
    totalElements: 0,
    totalPages: 0,
  }
  await page.route(WEIGHTS_URL, (route) =>
    route.fulfill({ status: 200, json: emptyPage }),
  )
  await page.route(ASSIGNMENTS_URL, (route) =>
    route.fulfill({ status: 200, json: emptyPage }),
  )
  await page.route(SESSIONS_URL, (route) =>
    route.fulfill({ status: 200, json: emptyPage }),
  )
}

const nutrition = (page: Page) =>
  page.getByRole('region', { name: 'Alimentación' })

test.describe('como entrenador · alimentación del atleta (US-25)', () => {
  test.use({ timezoneId: 'UTC' })

  test.beforeEach(async ({ page }) => {
    await page.clock.setFixedTime(NOW)
    await seedSession(page, coach, 'access-1')
    await routeCurrentUser(page, coach)
    await routeAthleteProfile(page)
  })

  test('ve la semana con su constancia, abre un día y revisa una comida con comentario', async ({
    page,
  }) => {
    const { reviews, overviews } = await routeMealsApi(page, [
      almuerzo(),
      banana(),
    ])
    await page.goto(athleteProfilePath(athlete.id))

    const section = nutrition(page)
    await expect(section.getByText('1 de 7 días con comidas')).toBeVisible()
    expect(new URL(overviews[0].url()).searchParams.get('from')).toBe(
      '2026-11-11',
    )
    expect(new URL(overviews[0].url()).searchParams.get('to')).toBe(TODAY)

    await section
      .getByRole('button', {
        name: 'Ver las comidas del viernes, 13 de noviembre',
      })
      .click()

    await expect(
      section.getByRole('heading', { name: 'viernes, 13 de noviembre' }),
    ).toBeVisible()
    await expect(section.getByText('247,5 kcal').first()).toBeVisible()
    await expect(section.getByText('Pendiente de revisión')).toHaveCount(2)

    await section.getByRole('button', { name: 'Revisar almuerzo' }).click()
    await section
      .getByLabel('Comentario para el atleta')
      .fill('  Buena porción de proteína  ')
    await section.getByRole('button', { name: 'Marcar como revisada' }).click()

    await expect(
      section
        .getByRole('status')
        .filter({ hasText: 'Marcaste la comida como revisada.' }),
    ).toBeVisible()
    expect(reviews).toHaveLength(1)
    expect(reviews[0].postDataJSON()).toEqual({
      observation: 'Buena porción de proteína',
    })
    // la lista del día se vuelve a pedir: la comida aparece revisada con el comentario
    await expect(section.getByText('Buena porción de proteína')).toBeVisible()
    await expect(section.getByText('Pendiente de revisión')).toHaveCount(1)
    await expect(section.getByText(/Revisada el/)).toHaveCount(1)

    // la semana quedó invalidada: al volver se pide de nuevo
    const requested = overviews.length
    await section.getByText('Semana', { exact: true }).click()
    await expect(section.getByText('1 de 7 días con comidas')).toBeVisible()
    expect(overviews.length).toBeGreaterThan(requested)
  })

  test('sin comidas en la semana muestra el estado vacío y navega a la anterior', async ({
    page,
  }) => {
    const { overviews } = await routeMealsApi(page, [])
    await page.goto(athleteProfilePath(athlete.id))

    const section = nutrition(page)
    await expect(
      section.getByRole('heading', {
        name: 'Sin comidas registradas en estos días',
      }),
    ).toBeVisible()
    await expect(
      section.getByRole('button', { name: 'Semana siguiente' }),
    ).toBeDisabled()

    await section.getByRole('button', { name: 'Semana anterior' }).click()

    await expect(
      section.getByText('4 de noviembre al 10 de noviembre de 2026'),
    ).toBeVisible()
    expect(new URL(overviews.at(-1)!.url()).searchParams.get('to')).toBe(
      '2026-11-10',
    )
  })

  test('un 403 muestra el motivo sin Reintentar', async ({ page }) => {
    await routeMealsApi(page, [], { overviewStatus: 403 })
    await page.goto(athleteProfilePath(athlete.id))

    const section = nutrition(page)
    await expect(
      section.getByText('No tenés acceso a este atleta'),
    ).toBeVisible()
    await expect(
      section.getByRole('button', { name: 'Reintentar' }),
    ).toHaveCount(0)
  })

  test('en un celular no hay scroll horizontal', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 780 })
    await routeMealsApi(page, [almuerzo(), banana()])
    await page.goto(athleteProfilePath(athlete.id))

    const section = nutrition(page)
    await section
      .getByRole('button', {
        name: 'Ver las comidas del viernes, 13 de noviembre',
      })
      .click()
    await section.getByRole('button', { name: 'Revisar almuerzo' }).click()
    await expect(section.getByLabel('Comentario para el atleta')).toBeVisible()

    const overflow = await page.evaluate(
      'document.documentElement.scrollWidth - window.innerWidth',
    )
    expect(overflow).toBeLessThanOrEqual(0)
  })
})

test.describe('como atleta · revisión de sus comidas (US-25)', () => {
  test.use({ timezoneId: 'UTC' })

  test.beforeEach(async ({ page }) => {
    await page.clock.setFixedTime(NOW)
    await seedSession(page, athlete, 'access-1')
    await routeCurrentUser(page, athlete)
    await page.route(FOODS_URL, (route) =>
      route.fulfill({
        status: 200,
        json: {
          content: [],
          page: 0,
          size: 20,
          totalElements: 0,
          totalPages: 0,
        },
      }),
    )
  })

  test('ve qué comidas revisó su entrenador y su comentario, sin poder revisarlas', async ({
    page,
  }) => {
    const reviewed = {
      ...almuerzo(),
      review: {
        reviewedAt: '2026-11-14T15:00:00Z',
        observation: 'Sumá verduras a la cena',
      },
    }
    await routeMealsApi(page, [reviewed, banana()])
    await page.goto(`${paths.meals}?date=${MEAL_DAY}`)

    const list = page.getByRole('list', { name: 'Comidas del día' })
    await expect(list.getByRole('listitem').first()).toBeVisible()
    await expect(list.getByText(/Revisada por tu entrenador el/)).toHaveCount(1)
    await expect(list.getByText('Sumá verduras a la cena')).toBeVisible()
    await expect(
      page.getByRole('button', { name: /Revisar|Marcar como revisada/ }),
    ).toHaveCount(0)
  })
})
