import { expect, test, type Page, type Request } from '@playwright/test'
import { athleteEditPath, paths } from '../src/router/paths.ts'
import {
  apiError,
  athlete,
  coach,
  routeCurrentUser,
  seedSession,
} from './auth-helpers.ts'

const ATHLETES_URL = /\/api\/athletes(\?.*)?$/
const ATHLETE_URL =
  /\/api\/athletes\/[^/?]+(\/(deactivate|reactivate|unlink))?$/

const juanaJson = () => ({
  id: '7d1f3c2a-5b6e-4f80-9a1b-2c3d4e5f6a7b',
  coachId: coach.id as string | null,
  firstName: 'Juana',
  lastName: 'Pérez',
  email: 'juana@example.com',
  phone: null,
  status: 'ACTIVE',
  active: true,
  sex: 'FEMALE',
  experienceLevel: 'BEGINNER',
  birthDate: null,
  heightCm: 165.5,
  initialWeightKg: 62,
  goal: 'Hipertrofia' as string | null,
  injuries: null,
  limitations: null,
  availableDays: 3,
  startDate: null,
  createdAt: '2026-10-27T15:00:00Z',
})

type AthleteJson = ReturnType<typeof juanaJson>

// imita al backend de US-07 con un solo atleta: lo que se edita se ve en el listado
// y al desvincularlo deja de pertenecerle al entrenador
const routeBackend = async (page: Page, initial: AthleteJson = juanaJson()) => {
  let current = initial
  const requests: Request[] = []

  await page.route(ATHLETES_URL, (route) => {
    const content = current.coachId ? [current] : []
    return route.fulfill({
      status: 200,
      json: {
        content,
        page: 0,
        size: 20,
        totalElements: content.length,
        totalPages: content.length ? 1 : 0,
      },
    })
  })

  await page.route(ATHLETE_URL, (route) => {
    const request = route.request()
    requests.push(request)
    const path = new URL(request.url()).pathname.replace('/api', '')
    if (!path.startsWith(`/athletes/${current.id}`)) {
      return route.fulfill(apiError(404, 'Atleta no encontrado', path))
    }
    if (!current.coachId) {
      return route.fulfill(apiError(403, 'No tenés acceso a este atleta', path))
    }
    if (path.endsWith('/unlink')) {
      current = { ...current, coachId: null }
      return route.fulfill({ status: 204 })
    }
    if (path.endsWith('/deactivate') || path.endsWith('/reactivate')) {
      current = { ...current, active: path.endsWith('/reactivate') }
      return route.fulfill({ status: 200, json: current })
    }
    if (request.method() === 'PUT') {
      current = { ...current, ...request.postDataJSON() }
      return route.fulfill({ status: 200, json: current })
    }
    return route.fulfill({ status: 200, json: current })
  })

  return requests
}

const card = (page: Page, name: string) => page.getByRole('region', { name })

test.describe('como entrenador', () => {
  test.beforeEach(async ({ page }) => {
    await seedSession(page, coach, 'access-1')
    await routeCurrentUser(page, coach)
  })

  test('edita un atleta desde el listado y ve los cambios', async ({
    page,
  }) => {
    const requests = await routeBackend(page)
    await page.goto(paths.athletes)

    await card(page, 'Juana Pérez')
      .getByRole('link', { name: 'Editar a Juana Pérez' })
      .click()
    await expect(page).toHaveURL(athleteEditPath(juanaJson().id))
    await expect(
      page.getByRole('heading', { name: 'Editar a Juana Pérez', level: 1 }),
    ).toBeVisible()
    await expect(page.getByLabel('Altura')).toHaveValue('165.5')

    await page.getByLabel('Objetivo').fill('Fuerza')
    await page.getByLabel('Altura').fill('')
    await page.getByRole('button', { name: 'Guardar cambios' }).click()

    await expect(page).toHaveURL(paths.athletes)
    // por texto: el skeleton del listado también es un status
    await expect(
      page
        .getByRole('status')
        .filter({ hasText: 'Guardaste los cambios de Juana Pérez.' }),
    ).toBeVisible()
    await expect(card(page, 'Juana Pérez')).toContainText('Fuerza')

    const put = requests.find((request) => request.method() === 'PUT')
    expect(put?.postDataJSON()).toMatchObject({
      firstName: 'Juana',
      goal: 'Fuerza',
      heightCm: null,
      sex: 'FEMALE',
      availableDays: 3,
    })
    expect(put?.postDataJSON()).not.toHaveProperty('password')
  })

  test('muestra el mensaje del backend cuando el email ya existe', async ({
    page,
  }) => {
    await routeBackend(page)
    await page.route(ATHLETE_URL, (route) =>
      route.request().method() === 'PUT'
        ? route.fulfill(
            apiError(
              409,
              'Ya existe un usuario registrado con el email lucas@example.com',
              '/athletes',
            ),
          )
        : route.fallback(),
    )
    await page.goto(athleteEditPath(juanaJson().id))

    await page.getByLabel('Email').fill('lucas@example.com')
    await page.getByRole('button', { name: 'Guardar cambios' }).click()

    await expect(page.getByRole('alert')).toContainText(
      'Ya existe un usuario registrado con el email lucas@example.com',
    )
    await expect(page).toHaveURL(athleteEditPath(juanaJson().id))
  })

  test('desactiva y reactiva la cuenta', async ({ page }) => {
    await routeBackend(page)
    await page.goto(athleteEditPath(juanaJson().id))

    await page.getByRole('button', { name: 'Desactivar cuenta' }).click()
    const dialog = page.getByRole('dialog', {
      name: '¿Desactivar la cuenta de Juana Pérez?',
    })
    await dialog.getByRole('button', { name: 'Desactivar' }).click()

    await expect(dialog).toBeHidden()
    await expect(page.getByText('Desactivada')).toBeVisible()

    await page.getByRole('button', { name: 'Reactivar cuenta' }).click()
    await expect(page.getByText('Activa', { exact: true })).toBeVisible()
  })

  test('cancelar la desvinculación no la ejecuta', async ({ page }) => {
    const requests = await routeBackend(page)
    await page.goto(athleteEditPath(juanaJson().id))

    await page.getByRole('button', { name: 'Desvincular' }).click()
    await page.keyboard.press('Escape')

    await expect(page.getByRole('dialog')).toBeHidden()
    expect(requests.some((r) => r.url().endsWith('/unlink'))).toBe(false)
  })

  test('desvincula un atleta y deja de aparecer en el listado', async ({
    page,
  }) => {
    await routeBackend(page)
    await page.goto(athleteEditPath(juanaJson().id))

    await page.getByRole('button', { name: 'Desvincular' }).click()
    await page
      .getByRole('dialog', { name: '¿Desvincular a Juana Pérez?' })
      .getByRole('button', { name: 'Desvincular' })
      .click()

    await expect(page).toHaveURL(paths.athletes)
    // por texto: el skeleton del listado también es un status
    await expect(
      page.getByRole('status').filter({
        hasText: 'Desvinculaste a Juana Pérez.',
      }),
    ).toBeVisible()
    await expect(page.getByText('Todavía no tenés atletas')).toBeVisible()
  })

  test('un atleta inexistente muestra el aviso del backend', async ({
    page,
  }) => {
    await routeBackend(page)
    await page.goto(athleteEditPath('no-existe'))

    await expect(page.getByText('No encontramos este atleta')).toBeVisible()
    await expect(page.getByText('Atleta no encontrado')).toBeVisible()
  })
})

test('un atleta no puede entrar a la edición de atletas', async ({ page }) => {
  await seedSession(page, athlete, 'access-1')
  await routeCurrentUser(page, athlete)

  await page.goto(athleteEditPath(juanaJson().id))

  await expect(page).toHaveURL(paths.dashboard)
})
