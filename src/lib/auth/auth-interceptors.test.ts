import {
  AxiosError,
  AxiosHeaders,
  type AxiosAdapter,
  type InternalAxiosRequestConfig,
} from 'axios'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { authResponse, session } from '../../test/auth-fixtures'
import { get, httpClient, post } from '../api/client'
import { getSession, saveSession } from './session-store'

// se prueba el cliente real (con sus interceptores) reemplazando solo el adapter HTTP
const adapter = vi.fn<AxiosAdapter>()

type Reply = { status: number; data?: unknown }

const respondWith = (handler: (config: InternalAxiosRequestConfig) => Reply) =>
  adapter.mockImplementation(async (config) => {
    const { status, data = '' } = handler(config)
    const response = {
      data,
      status,
      statusText: '',
      headers: new AxiosHeaders(),
      config,
    }
    if (status >= 400) {
      throw new AxiosError(
        'Request failed',
        'ERR_BAD_REQUEST',
        config,
        null,
        response,
      )
    }
    return response
  })

const authorization = (config: InternalAxiosRequestConfig) =>
  config.headers.get('Authorization')

const requestsTo = (url: string) =>
  adapter.mock.calls.map(([config]) => config).filter((c) => c.url === url)

const unauthorized = {
  status: 401,
  data: { status: 401, message: 'Debe iniciar sesión para acceder' },
}

const refreshed = authResponse('COACH', {
  accessToken: 'access-2',
  refreshToken: 'refresh-2',
})

// /athletes responde 401 al token viejo y 200 al nuevo; /auth/refresh rota la sesión
const expiredAccessToken = (config: InternalAxiosRequestConfig): Reply => {
  if (config.url === '/auth/refresh') return { status: 200, data: refreshed }
  if (authorization(config) === 'Bearer access-1') return unauthorized
  return { status: 200, data: { ok: true } }
}

beforeEach(() => {
  adapter.mockReset()
  httpClient.defaults.adapter = adapter
})

describe('interceptores de autenticación', () => {
  it('agrega el access token de la sesión', async () => {
    saveSession(session())
    respondWith(() => ({ status: 200, data: [] }))

    await get('/athletes')

    expect(authorization(requestsTo('/athletes')[0])).toBe('Bearer access-1')
  })

  it('sin sesión no agrega el header', async () => {
    respondWith(() => ({ status: 200, data: [] }))

    await get('/athletes')

    expect(authorization(requestsTo('/athletes')[0])).toBeFalsy()
  })

  it('no manda el access token a login ni a refresh', async () => {
    saveSession(session())
    respondWith(() => ({ status: 200, data: authResponse() }))

    await post('/auth/login', { email: 'ana@example.com', password: 'x' })
    await post('/auth/refresh', { refreshToken: 'refresh-1' })

    expect(authorization(requestsTo('/auth/login')[0])).toBeFalsy()
    expect(authorization(requestsTo('/auth/refresh')[0])).toBeFalsy()
  })

  it('ante un 401 refresca la sesión y reintenta con el token nuevo', async () => {
    saveSession(session())
    respondWith(expiredAccessToken)

    await expect(get('/athletes')).resolves.toEqual({ ok: true })

    const [refresh] = requestsTo('/auth/refresh')
    expect(JSON.parse(refresh.data)).toEqual({ refreshToken: 'refresh-1' })
    const [first, retry] = requestsTo('/athletes')
    expect(authorization(first)).toBe('Bearer access-1')
    expect(authorization(retry)).toBe('Bearer access-2')
    expect(getSession()).toMatchObject({
      accessToken: 'access-2',
      refreshToken: 'refresh-2',
    })
  })

  // el backend rota el refresh token: dos refresh con el mismo token cerrarían la sesión
  it('varios 401 al mismo tiempo comparten un único refresh', async () => {
    saveSession(session())
    respondWith(expiredAccessToken)

    const results = await Promise.all([
      get('/athletes'),
      get('/athletes'),
      get('/athletes'),
    ])

    expect(results).toEqual([{ ok: true }, { ok: true }, { ok: true }])
    expect(requestsTo('/auth/refresh')).toHaveLength(1)
  })

  it('si el refresh falla, cierra la sesión y rechaza con un ApiError 401', async () => {
    saveSession(session())
    respondWith(() => unauthorized)

    await expect(get('/athletes')).rejects.toMatchObject({
      name: 'ApiError',
      status: 401,
    })

    expect(getSession()).toBeNull()
    expect(requestsTo('/auth/refresh')).toHaveLength(1)
  })

  it('no reintenta más de una vez si el token nuevo también es rechazado', async () => {
    saveSession(session())
    respondWith((config) =>
      config.url === '/auth/refresh'
        ? { status: 200, data: refreshed }
        : unauthorized,
    )

    await expect(get('/athletes')).rejects.toMatchObject({ status: 401 })

    expect(requestsTo('/athletes')).toHaveLength(2)
    expect(requestsTo('/auth/refresh')).toHaveLength(1)
  })

  it('un 401 del login no intenta refrescar', async () => {
    saveSession(session())
    respondWith(() => ({
      status: 401,
      data: { status: 401, message: 'Email o contraseña incorrectos' },
    }))

    await expect(
      post('/auth/login', { email: 'ana@example.com', password: 'x' }),
    ).rejects.toMatchObject({
      status: 401,
      message: 'Email o contraseña incorrectos',
    })

    expect(requestsTo('/auth/refresh')).toHaveLength(0)
  })

  it('sin sesión un 401 no intenta refrescar', async () => {
    respondWith(() => unauthorized)

    await expect(get('/athletes')).rejects.toMatchObject({ status: 401 })

    expect(requestsTo('/auth/refresh')).toHaveLength(0)
  })

  it('los errores que no son 401 pasan sin refrescar', async () => {
    saveSession(session())
    respondWith(() => ({ status: 403, data: { status: 403, message: 'No' } }))

    await expect(get('/athletes')).rejects.toMatchObject({ status: 403 })

    expect(requestsTo('/auth/refresh')).toHaveLength(0)
    expect(getSession()).not.toBeNull()
  })
})
