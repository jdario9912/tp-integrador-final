import { expect, test, type Page } from '@playwright/test'
import { athleteProfilePath, paths } from '../src/router/paths.ts'
import {
  apiError,
  athlete,
  coach,
  routeCurrentUser,
  seedSession,
} from './auth-helpers.ts'

// US-47: alertas pendientes en el panel del entrenador. La API se intercepta con un backend en
// memoria: atender una la saca de las pendientes
const ALERTS_URL = /\/api\/alerts$/
const HANDLE_URL = /\/api\/alerts\/[^/]+\/handle$/
const DASHBOARD_URL = /\/api\/coaches\/me\/dashboard$/

type AlertJson = {
  id: string
  athleteId: string
  athleteName: string
  type: string
  severity: 'INFO' | 'WARNING' | 'CRITICAL'
  message: string
  generatedAt: string
  handledAt: string | null
}

// ordenadas como las manda el backend: severidad y después fecha
const alertsJson = (): AlertJson[] => [
  {
    id: 'a0000000-0000-4000-8000-000000000001',
    athleteId: '1a2b3c4d-0000-4000-8000-000000000001',
    athleteName: 'Ana Gómez',
    type: 'INACTIVITY',
    severity: 'CRITICAL',
    message: 'No registra entrenamientos hace 10 días.',
    generatedAt: '2026-11-18T09:00:00Z',
    handledAt: null,
  },
  {
    id: 'a0000000-0000-4000-8000-000000000002',
    athleteId: '1a2b3c4d-0000-4000-8000-000000000002',
    athleteName: 'Leo Gil',
    type: 'NO_WEIGHT_LOG',
    severity: 'WARNING',
    message: 'No registra su peso hace 9 días.',
    generatedAt: '2026-11-17T09:00:00Z',
    handledAt: null,
  },
  {
    id: 'a0000000-0000-4000-8000-000000000003',
    athleteId: '1a2b3c4d-0000-4000-8000-000000000003',
    athleteName: 'Sol Ruiz',
    type: 'PENDING_REVIEW',
    severity: 'INFO',
    message: 'Tiene 2 sesiones sin revisar.',
    generatedAt: '2026-11-16T09:00:00Z',
    handledAt: null,
  },
]

const emptyDashboard = {
  activeAthletes: { count: 3, athletes: [] },
  withoutRoutine: { count: 0, athletes: [] },
  pendingReviewSessions: { count: 0, athletes: [] },
  withoutRecentWeight: { count: 0, athletes: [] },
  warnings: [],
}

// handleStatus: lo que responde el PATCH (200 la atiende; 409, 403 o 404 la sacan igual, como
// pasaría si otra pestaña la atendió o el atleta dejó la cartera)
const routeAlerts = async (
  page: Page,
  initial: AlertJson[],
  handleStatus = 200,
) => {
  const pending = [...initial]
  const handled: string[] = []
  const listRequests: string[] = []
  await page.route(DASHBOARD_URL, (route) =>
    route.fulfill({ status: 200, json: emptyDashboard }),
  )
  await page.route(ALERTS_URL, (route) => {
    listRequests.push(route.request().url())
    return route.fulfill({ status: 200, json: pending })
  })
  await page.route(HANDLE_URL, (route) => {
    const id = route.request().url().split('/').at(-2) ?? ''
    handled.push(id)
    const index = pending.findIndex((alert) => alert.id === id)
    const [alert] = pending.splice(index, 1)
    const path = `/alerts/${id}/handle`
    if (handleStatus === 409)
      return route.fulfill(apiError(409, 'La alerta ya fue atendida', path))
    if (handleStatus === 404)
      return route.fulfill(apiError(404, 'La alerta no existe', path))
    return route.fulfill({
      status: 200,
      json: { ...alert, handledAt: '2026-11-19T15:00:00Z' },
    })
  })
  return { handled, listRequests }
}

const alertsCard = (page: Page) =>
  page.getByRole('region', { name: 'Requiere atención' })

test.describe('como entrenador', () => {
  test.beforeEach(async ({ page }) => {
    await seedSession(page, coach, 'access-1')
    await routeCurrentUser(page, coach)
  })

  test('ve las alertas pendientes en el orden del backend con su severidad', async ({
    page,
  }) => {
    await routeAlerts(page, alertsJson())

    await page.goto(paths.dashboard)

    const items = alertsCard(page).getByRole('listitem')
    await expect(items).toHaveCount(3)
    await expect(alertsCard(page)).toContainText('3 pendientes')
    await expect(items.nth(0)).toContainText('Ana Gómez')
    await expect(items.nth(0)).toContainText('Crítica')
    await expect(items.nth(0)).toContainText(
      'No registra entrenamientos hace 10 días.',
    )
    await expect(items.nth(1)).toContainText('Advertencia')
    await expect(items.nth(2)).toContainText('Info')
  })

  test('atiende una alerta y desaparece de las pendientes', async ({
    page,
  }) => {
    const backend = await routeAlerts(page, alertsJson())
    await page.goto(paths.dashboard)

    await alertsCard(page)
      .getByRole('button', { name: /Atender la alerta de Ana Gómez/ })
      .click()

    await expect(alertsCard(page).getByRole('status')).toContainText(
      'Atendiste la alerta de Ana Gómez.',
    )
    await expect(alertsCard(page).getByRole('listitem')).toHaveCount(2)
    await expect(
      alertsCard(page).getByRole('link', { name: 'Ana Gómez' }),
    ).toHaveCount(0)
    await expect(alertsCard(page)).toContainText('2 pendientes')
    expect(backend.handled).toEqual([alertsJson()[0].id])
  })

  test('si ya estaba atendida (409) lo avisa y la saca de la lista', async ({
    page,
  }) => {
    await routeAlerts(page, alertsJson().slice(0, 1), 409)
    await page.goto(paths.dashboard)

    await alertsCard(page)
      .getByRole('button', { name: /Atender la alerta de Ana Gómez/ })
      .click()

    await expect(alertsCard(page).getByRole('status')).toContainText(
      'La alerta de Ana Gómez ya estaba atendida.',
    )
    await expect(alertsCard(page)).toContainText('No tenés alertas pendientes.')
  })

  test('si ya no existe (404) muestra el mensaje del backend', async ({
    page,
  }) => {
    await routeAlerts(page, alertsJson().slice(0, 1), 404)
    await page.goto(paths.dashboard)

    await alertsCard(page)
      .getByRole('button', { name: /Atender la alerta de Ana Gómez/ })
      .click()

    await expect(alertsCard(page).getByRole('alert')).toContainText(
      'La alerta no existe',
    )
    await expect(alertsCard(page)).toContainText('No tenés alertas pendientes.')
  })

  test('desde una alerta llega a la ficha del atleta', async ({ page }) => {
    await routeAlerts(page, alertsJson())
    await page.goto(paths.dashboard)

    await alertsCard(page).getByRole('link', { name: 'Leo Gil' }).click()

    await expect(page).toHaveURL(athleteProfilePath(alertsJson()[1].athleteId))
  })

  test('sin alertas lo dice', async ({ page }) => {
    await routeAlerts(page, [])
    await page.goto(paths.dashboard)

    await expect(alertsCard(page)).toContainText('No tenés alertas pendientes.')
  })

  test('en un celular de 360 px cabe sin scroll horizontal', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 360, height: 800 })
    await routeAlerts(page, alertsJson())
    await page.goto(paths.dashboard)
    const button = alertsCard(page).getByRole('button', {
      name: /Atender la alerta de Ana Gómez/,
    })
    await expect(button).toBeVisible()

    const scrollsSideways = await page.evaluate(
      'document.documentElement.scrollWidth > document.documentElement.clientWidth',
    )
    expect(scrollsSideways).toBe(false)
    expect((await button.boundingBox())?.height ?? 0).toBeGreaterThanOrEqual(44)
  })
})

test('el atleta no pide las alertas', async ({ page }) => {
  await seedSession(page, athlete, 'access-1')
  await routeCurrentUser(page, athlete)
  const backend = await routeAlerts(page, alertsJson())

  await page.goto(paths.dashboard)

  await expect(
    page.getByRole('heading', { name: 'Dashboard', level: 1 }),
  ).toBeVisible()
  expect(backend.listRequests).toHaveLength(0)
})
