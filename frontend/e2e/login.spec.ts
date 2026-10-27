import { expect, test, type Page } from '@playwright/test'
import { paths } from '../src/router/paths.ts'
import {
  apiError,
  athlete,
  authResponse,
  coach,
  LOGIN_URL,
  REFRESH_URL,
  routeCurrentUser,
  seedSession,
  SESSION_KEY,
} from './auth-helpers.ts'

const loginWith = async (page: Page, email: string, password: string) => {
  await page.goto(paths.login)
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Contraseña').fill(password)
  await page.getByRole('button', { name: 'Ingresar' }).click()
}

test('el entrenador inicia sesión y ve su panel', async ({ page }) => {
  await page.route(LOGIN_URL, (route) =>
    route.fulfill({ status: 200, json: authResponse(coach) }),
  )
  await routeCurrentUser(page, coach)

  const requestPromise = page.waitForRequest(LOGIN_URL)
  await loginWith(page, ' ana@example.com ', '12345678')
  const request = await requestPromise

  expect(request.postDataJSON()).toEqual({
    email: 'ana@example.com',
    password: '12345678',
  })
  await expect(page).toHaveURL(paths.dashboard)
  await expect(
    page.getByRole('heading', { name: '¡Bienvenido de nuevo, Ana!' }),
  ).toBeVisible()
})

test('el atleta inicia sesión y ve su panel', async ({ page }) => {
  await page.route(LOGIN_URL, (route) =>
    route.fulfill({ status: 200, json: authResponse(athlete) }),
  )
  await routeCurrentUser(page, athlete)

  await loginWith(page, 'leo@example.com', '12345678')

  await expect(page).toHaveURL(paths.dashboard)
  await expect(page.getByText('Panel del atleta')).toBeVisible()
  await expect(page.getByText(/Bienvenido de nuevo/)).toHaveCount(0)
})

test('con credenciales inválidas muestra el error y no entra', async ({
  page,
}) => {
  await page.route(LOGIN_URL, (route) =>
    route.fulfill(
      apiError(401, 'Email o contraseña incorrectos', '/auth/login'),
    ),
  )

  await loginWith(page, 'ana@example.com', 'otra-clave')

  await expect(page.getByRole('alert')).toHaveText(
    'Email o contraseña incorrectos',
  )
  await expect(page).toHaveURL(paths.login)
})

test('con la cuenta desactivada muestra el aviso', async ({ page }) => {
  await page.route(LOGIN_URL, (route) =>
    route.fulfill(apiError(403, 'Tu cuenta está desactivada', '/auth/login')),
  )

  await loginWith(page, 'ana@example.com', '12345678')

  await expect(page.getByRole('alert')).toHaveText('Tu cuenta está desactivada')
  await expect(page).toHaveURL(paths.login)
})

test('la sesión se mantiene al recargar la página', async ({ page }) => {
  await page.route(LOGIN_URL, (route) =>
    route.fulfill({ status: 200, json: authResponse(coach) }),
  )
  await routeCurrentUser(page, coach)
  await loginWith(page, 'ana@example.com', '12345678')
  await expect(page).toHaveURL(paths.dashboard)

  await page.reload()

  await expect(page).toHaveURL(paths.dashboard)
  await expect(
    page.getByRole('heading', { name: '¡Bienvenido de nuevo, Ana!' }),
  ).toBeVisible()
})

test('sin sesión el dashboard redirige al login', async ({ page }) => {
  await page.goto(paths.dashboard)

  await expect(page).toHaveURL(paths.login)
  await expect(
    page.getByRole('heading', { name: 'Iniciar sesión' }),
  ).toBeVisible()
})

test('con el access token vencido refresca la sesión y sigue', async ({
  page,
}) => {
  await seedSession(page, coach, 'access-vencido')
  await routeCurrentUser(page, coach, 'access-nuevo')
  await page.route(REFRESH_URL, (route) =>
    route.fulfill({ status: 200, json: authResponse(coach, 'access-nuevo') }),
  )

  const refreshPromise = page.waitForRequest(REFRESH_URL)
  await page.goto(paths.dashboard)
  const refresh = await refreshPromise

  expect(refresh.postDataJSON()).toEqual({
    refreshToken: 'refresh-de-access-vencido',
  })
  await expect(
    page.getByRole('heading', { name: '¡Bienvenido de nuevo, Ana!' }),
  ).toBeVisible()
  await expect(page).toHaveURL(paths.dashboard)
  const stored = await page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key) ?? 'null'),
    SESSION_KEY,
  )
  expect(stored.accessToken).toBe('access-nuevo')
})

test('con el refresh token vencido vuelve al login', async ({ page }) => {
  await seedSession(page, coach, 'access-vencido')
  await routeCurrentUser(page, coach, 'access-nuevo')
  await page.route(REFRESH_URL, (route) =>
    route.fulfill(
      apiError(
        401,
        'La sesión expiró. Iniciá sesión nuevamente',
        '/auth/refresh',
      ),
    ),
  )

  await page.goto(paths.dashboard)

  await expect(page).toHaveURL(paths.login)
  const stored = await page.evaluate(
    (key) => localStorage.getItem(key),
    SESSION_KEY,
  )
  expect(stored).toBeNull()
})
