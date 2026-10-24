import { type Page } from '@playwright/test'
import { paths } from '../src/router/paths.ts'
import { E2E_API_URL } from './config.ts'

export const SESSION_KEY = 'tpif.session'

export const LOGIN_URL = `${E2E_API_URL}/auth/login`
export const REFRESH_URL = `${E2E_API_URL}/auth/refresh`
export const ME_URL = `${E2E_API_URL}/auth/me`
export const LOGOUT_URL = `${E2E_API_URL}/auth/logout`

export const coach = {
  id: 'f14b8801-422f-4411-bdf4-e7a4f3ac3c4c',
  firstName: 'Ana',
  lastName: 'Pérez',
  email: 'ana@example.com',
  role: 'COACH',
}

export const athlete = {
  id: '0a6d2b9e-7c51-4c1e-9d3f-2b8e5f6a7c10',
  firstName: 'Leo',
  lastName: 'Gil',
  email: 'leo@example.com',
  role: 'ATHLETE',
}

export const authResponse = (user: typeof coach, accessToken = 'access-1') => ({
  accessToken,
  tokenType: 'Bearer',
  expiresIn: 900,
  refreshToken: `refresh-de-${accessToken}`,
  refreshExpiresIn: 7200,
  role: user.role,
  user,
})

export const apiError = (status: number, message: string, path: string) => ({
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
export const routeCurrentUser = async (
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

// arranca con una sesión guardada, como si el usuario ya se hubiera logueado antes
export const seedSession = async (
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
