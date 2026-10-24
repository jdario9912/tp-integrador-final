import { expect, test, type Page } from '@playwright/test'
import { paths } from '../src/router/paths.ts'
import { E2E_API_URL } from './config.ts'

const LOGIN_URL = `${E2E_API_URL}/auth/login`
const REFRESH_URL = `${E2E_API_URL}/auth/refresh`
const ME_URL = `${E2E_API_URL}/auth/me`
const SESSION_KEY = 'tpif.session'

const coach = {
  id: 'f14b8801-422f-4411-bdf4-e7a4f3ac3c4c',
  firstName: 'Ana',
  lastName: 'Pérez',
  email: 'ana@example.com',
  role: 'COACH',
}

const athlete = {
  id: '0a6d2b9e-7c51-4c1e-9d3f-2b8e5f6a7c10',
  firstName: 'Leo',
  lastName: 'Gil',
  email: 'leo@example.com',
  role: 'ATHLETE',
}

const authResponse = (user: typeof coach, accessToken = 'access-1') => ({
  accessToken,
  tokenType: 'Bearer',
  expiresIn: 900,
  refreshToken: `refresh-de-${accessToken}`,
  refreshExpiresIn: 7200,
  role: user.role,
  user,
})

const apiError = (status: number, message: string, path: string) => ({
  status,
  json: {
    timestamp: '2026-10-23T18:00:00Z',
    status,
    error: status === 401 ? 'Unauthorized' : 'Forbidden',
    message,
    path: `/api${path}`,
  },
})

// GET /auth/me responde con el usuario si el token es el esperado y 401 si no
const routeCurrentUser = async (
  page: Page,
  user: typeof coach,
  validToken = 'access-1',
) => {
  await page.route(ME_URL, (route) =>
    route.request().headers().authorization === `Bearer ${validToken}`
      ? route.fulfill({ status: 200, json: user })
      : route.fulfill(apiError(401, 'Debe iniciar sesión', '/auth/me')),
  )
}

const loginWith = async (page: Page, email: string, password: string) => {
  await page.goto(paths.login)
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Contraseña').fill(password)
  await page.getByRole('button', { name: 'Ingresar' }).click()
}

// arranca con una sesión guardada, como si el usuario ya se hubiera logueado antes
const seedSession = async (
  page: Page,
  user: typeof coach,
  accessToken: string,
) => {
  await page.goto(paths.login)
  const { refreshToken } = authResponse(user, accessToken)
  await page.evaluate(
    ([key, value]) => localStorage.setItem(key, value),
    [SESSION_KEY, JSON.stringify({ accessToken, refreshToken, user })],
  )
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
  await expect(page.getByText('Panel del entrenador')).toBeVisible()
  await expect(page.getByText('Hola, Ana')).toBeVisible()
})

test('el atleta inicia sesión y ve su panel', async ({ page }) => {
  await page.route(LOGIN_URL, (route) =>
    route.fulfill({ status: 200, json: authResponse(athlete) }),
  )
  await routeCurrentUser(page, athlete)

  await loginWith(page, 'leo@example.com', '12345678')

  await expect(page).toHaveURL(paths.dashboard)
  await expect(page.getByText('Panel del atleta')).toBeVisible()
  await expect(page.getByText('Panel del entrenador')).toHaveCount(0)
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
  await expect(page.getByText('Panel del entrenador')).toBeVisible()
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
  await expect(page.getByText('Hola, Ana')).toBeVisible()
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
