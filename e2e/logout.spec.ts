import { expect, test, type Page } from '@playwright/test'
import { paths } from '../src/router/paths.ts'
import {
  apiError,
  athlete,
  authResponse,
  coach,
  LOGOUT_URL,
  REFRESH_URL,
  routeCurrentUser,
  seedSession,
  SESSION_KEY,
} from './auth-helpers.ts'

const storedSession = (page: Page) =>
  page.evaluate((key) => localStorage.getItem(key), SESSION_KEY)

test('el entrenador cierra sesión y vuelve al login', async ({ page }) => {
  await seedSession(page, coach, 'access-1')
  await routeCurrentUser(page, coach)
  await page.route(LOGOUT_URL, (route) => route.fulfill({ status: 204 }))

  await page.goto(paths.dashboard)
  await expect(
    page.getByRole('heading', { name: '¡Bienvenido de nuevo, Ana!' }),
  ).toBeVisible()

  const requestPromise = page.waitForRequest(LOGOUT_URL)
  await page.getByRole('button', { name: 'Cerrar sesión' }).click()
  const request = await requestPromise

  expect(request.headers().authorization).toBe('Bearer access-1')
  await expect(page).toHaveURL(paths.login)
  expect(await storedSession(page)).toBeNull()

  // el dashboard vuelve a exigir sesión
  await page.goto(paths.dashboard)
  await expect(page).toHaveURL(paths.login)
})

test('el atleta también puede cerrar sesión', async ({ page }) => {
  await seedSession(page, athlete, 'access-1')
  await routeCurrentUser(page, athlete)
  await page.route(LOGOUT_URL, (route) => route.fulfill({ status: 204 }))

  await page.goto(paths.dashboard)
  await expect(page.getByText('Panel del atleta')).toBeVisible()

  const requestPromise = page.waitForRequest(LOGOUT_URL)
  await page.getByRole('button', { name: 'Cerrar sesión' }).click()
  const request = await requestPromise

  expect(request.headers().authorization).toBe('Bearer access-1')
  await expect(page).toHaveURL(paths.login)
  expect(await storedSession(page)).toBeNull()
})

test('si el logout falla, igual cierra la sesión local y avisa', async ({
  page,
}) => {
  await seedSession(page, coach, 'access-1')
  await routeCurrentUser(page, coach)
  await page.route(LOGOUT_URL, (route) => route.abort())

  await page.goto(paths.dashboard)
  await page.getByRole('button', { name: 'Cerrar sesión' }).click()

  await expect(page).toHaveURL(paths.login)
  await expect(page.getByRole('status')).toHaveText(
    'Cerraste sesión en este dispositivo, pero no pudimos confirmarlo con el servidor.',
  )
  expect(await storedSession(page)).toBeNull()

  // al recargar el login el aviso ya no corresponde
  await page.reload()
  await expect(
    page.getByRole('heading', { name: 'Iniciar sesión' }),
  ).toBeVisible()
  await expect(page.getByRole('status')).toHaveCount(0)
})

test('con el access token vencido refresca, reintenta y no avisa', async ({
  page,
}) => {
  await seedSession(page, coach, 'access-vencido')
  // el dashboard carga con el token vencido; el 401 se fuerza recién en el logout
  await routeCurrentUser(page, coach, 'access-vencido')
  await page.route(REFRESH_URL, (route) =>
    route.fulfill({ status: 200, json: authResponse(coach, 'access-2') }),
  )

  const logoutAuthorizations: string[] = []
  await page.route(LOGOUT_URL, (route) => {
    logoutAuthorizations.push(route.request().headers().authorization ?? '')
    return logoutAuthorizations.length === 1
      ? route.fulfill(apiError(401, 'Debe iniciar sesión', '/auth/logout'))
      : route.fulfill({ status: 204 })
  })

  await page.goto(paths.dashboard)
  await expect(
    page.getByRole('heading', { name: '¡Bienvenido de nuevo, Ana!' }),
  ).toBeVisible()

  const refreshPromise = page.waitForRequest(REFRESH_URL)
  await page.getByRole('button', { name: 'Cerrar sesión' }).click()
  const refresh = await refreshPromise

  expect(refresh.postDataJSON()).toEqual({
    refreshToken: 'refresh-de-access-vencido',
  })
  await expect(page).toHaveURL(paths.login)
  expect(logoutAuthorizations).toEqual([
    'Bearer access-vencido',
    'Bearer access-2',
  ])
  await expect(page.getByRole('status')).toHaveCount(0)
  expect(await storedSession(page)).toBeNull()
})
