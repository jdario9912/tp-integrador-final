import { expect, test, type Page, type Request } from '@playwright/test'
import { athleteProfilePath, paths } from '../src/router/paths.ts'
import {
  athlete,
  coach,
  routeCurrentUser,
  seedSession,
} from './auth-helpers.ts'

// US-11: panel del entrenador con el estado de su cartera (GET /coaches/me/dashboard)
const DASHBOARD_URL = /\/api\/coaches\/me\/dashboard$/
// US-47: las alertas se cubren en coach-alerts.spec; acá, sin alertas
const ALERTS_URL = /\/api\/alerts$/

const ana = {
  id: '1a2b3c4d-0000-4000-8000-000000000001',
  firstName: 'Ana',
  lastName: 'Gómez',
}
const leo = {
  id: '1a2b3c4d-0000-4000-8000-000000000002',
  firstName: 'Leo',
  lastName: 'Gil',
}
const sol = {
  id: '1a2b3c4d-0000-4000-8000-000000000003',
  firstName: 'Sol',
  lastName: 'Ruiz',
}

// ejemplo del contrato: listas ordenadas por apellido y nombre
const dashboardJson = () => ({
  activeAthletes: { count: 3, athletes: [leo, ana, sol] } as object | null,
  withoutRoutine: { count: 1, athletes: [sol] } as object | null,
  pendingReviewSessions: {
    count: 3,
    athletes: [
      { ...leo, pendingCount: 2 },
      { ...ana, pendingCount: 1 },
    ],
  } as object | null,
  withoutRecentWeight: {
    count: 2,
    athletes: [
      { ...ana, lastRecordedOn: '2026-11-01' },
      { ...sol, lastRecordedOn: null },
    ],
  } as object | null,
  warnings: [] as string[],
})

type DashboardJson = ReturnType<typeof dashboardJson>

const emptyDashboardJson = (): DashboardJson => ({
  activeAthletes: { count: 0, athletes: [] },
  withoutRoutine: { count: 0, athletes: [] },
  pendingReviewSessions: { count: 0, athletes: [] },
  withoutRecentWeight: { count: 0, athletes: [] },
  warnings: [],
})

const routeDashboard = async (page: Page, ...responses: DashboardJson[]) => {
  const requests: Request[] = []
  await page.route(ALERTS_URL, (route) =>
    route.fulfill({ status: 200, json: [] }),
  )
  await page.route(DASHBOARD_URL, (route) => {
    requests.push(route.request())
    const json = responses[Math.min(requests.length, responses.length) - 1]
    return route.fulfill({ status: 200, json })
  })
  return requests
}

const card = (page: Page, name: string) => page.getByRole('region', { name })

test.describe('como entrenador', () => {
  test.beforeEach(async ({ page }) => {
    await seedSession(page, coach, 'access-1')
    await routeCurrentUser(page, coach)
  })

  test('ve las cuatro métricas de su cartera con sus atletas', async ({
    page,
  }) => {
    await routeDashboard(page, dashboardJson())

    await page.goto(paths.dashboard)

    const active = card(page, 'Atletas activos')
    await expect(active.getByRole('link')).toHaveText([
      'Leo Gil',
      'Ana Gómez',
      'Sol Ruiz',
    ])
    await expect(active).toContainText('3')
    await expect(card(page, 'Sin rutina vigente').getByRole('link')).toHaveText(
      ['Sol Ruiz'],
    )
    const pending = card(page, 'Sesiones por revisar')
    await expect(pending).toContainText('2 sesiones por revisar')
    await expect(pending).toContainText('1 sesión por revisar')
    const weight = card(page, 'Sin peso reciente')
    await expect(weight).toContainText(
      'Último registro: 1 de noviembre de 2026',
    )
    await expect(weight).toContainText('Nunca registró su peso')
  })

  test('desde una métrica llega a la ficha del atleta', async ({ page }) => {
    await routeDashboard(page, dashboardJson())
    await page.goto(paths.dashboard)

    await card(page, 'Sesiones por revisar')
      .getByRole('link', { name: 'Leo Gil' })
      .click()

    await expect(page).toHaveURL(athleteProfilePath(leo.id))
  })

  test('si una métrica falla, avisa en esa tarjeta y el resto se muestra', async ({
    page,
  }) => {
    const requests = await routeDashboard(
      page,
      {
        ...dashboardJson(),
        withoutRecentWeight: null,
        warnings: ['withoutRecentWeight'],
      },
      dashboardJson(),
    )

    await page.goto(paths.dashboard)

    const weight = card(page, 'Sin peso reciente')
    await expect(weight.getByRole('note')).toContainText(
      'No pudimos calcular esta métrica.',
    )
    await expect(card(page, 'Atletas activos').getByRole('link')).toHaveCount(3)
    await expect(
      card(page, 'Sesiones por revisar').getByRole('link'),
    ).toHaveCount(2)

    await weight.getByRole('button', { name: 'Reintentar' }).click()

    await expect(weight.getByRole('link')).toHaveText(['Ana Gómez', 'Sol Ruiz'])
    expect(requests).toHaveLength(2)
  })

  test('sin atletas lo invita a registrar el primero', async ({ page }) => {
    await routeDashboard(page, emptyDashboardJson())
    await page.goto(paths.dashboard)

    await expect(
      page.getByRole('heading', { name: 'Todavía no tenés atletas activos' }),
    ).toBeVisible()
    await page.getByRole('link', { name: 'Registrar atleta' }).click()

    await expect(page).toHaveURL(paths.newAthlete)
  })

  test('en un celular de 360 px el panel cabe sin scroll horizontal', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 360, height: 800 })
    await routeDashboard(page, dashboardJson())
    await page.goto(paths.dashboard)
    await expect(card(page, 'Atletas activos').getByRole('link')).toHaveCount(3)

    // como string: el tsconfig de los E2E no incluye los tipos del DOM
    const scrollsSideways = await page.evaluate(
      'document.documentElement.scrollWidth > document.documentElement.clientWidth',
    )
    expect(scrollsSideways).toBe(false)
  })
})

test.describe('como atleta', () => {
  test('no pide el panel del entrenador', async ({ page }) => {
    await seedSession(page, athlete, 'access-1')
    await routeCurrentUser(page, athlete)
    const requests = await routeDashboard(page, dashboardJson())

    await page.goto(paths.dashboard)

    await expect(
      page.getByRole('heading', { name: 'Dashboard', level: 1 }),
    ).toBeVisible()
    expect(requests).toHaveLength(0)
  })
})
