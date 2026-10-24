import axios, {
  type AxiosInstance,
  type InternalAxiosRequestConfig,
} from 'axios'
import { clearSession, getSession, saveSession } from './session-store'
import { toSession, type AuthResponse } from './types'

export const LOGIN_URL = '/auth/login'
export const REFRESH_URL = '/auth/refresh'

type RetriableConfig = InternalAxiosRequestConfig & { _retried?: boolean }

// login y refresh no llevan access token y su 401 no dispara un refresh.
// /auth/logout queda fuera a propósito: necesita el access token y, si venció, el
// interceptor tiene que refrescar y reintentar el logout con el token nuevo.
const isAuthRequest = (config: InternalAxiosRequestConfig) =>
  config.url === LOGIN_URL || config.url === REFRESH_URL

const bearer = (accessToken: string) => `Bearer ${accessToken}`

// un único refresh a la vez: el backend rota el refresh token en cada uso, así que dos
// refresh en paralelo con el mismo token harían que el segundo falle y cierre la sesión
let refreshInFlight: Promise<void> | null = null

const refreshSession = (client: AxiosInstance, refreshToken: string) => {
  refreshInFlight ??= client
    .post<AuthResponse>(REFRESH_URL, { refreshToken })
    .then(({ data }) => saveSession(toSession(data)))
    .finally(() => {
      refreshInFlight = null
    })
  return refreshInFlight
}

// Se instalan ANTES del interceptor que convierte los errores en ApiError: este necesita
// el error de axios original (con su config) para poder reintentar el request
export const installAuthInterceptors = (client: AxiosInstance) => {
  client.interceptors.request.use((config) => {
    const session = getSession()
    if (session && !isAuthRequest(config)) {
      config.headers.set('Authorization', bearer(session.accessToken))
    }
    return config
  })

  client.interceptors.response.use(undefined, async (error: unknown) => {
    if (!axios.isAxiosError(error) || error.response?.status !== 401) {
      return Promise.reject(error)
    }
    const config = error.config as RetriableConfig | undefined
    const session = getSession()
    if (!config || !session || config._retried || isAuthRequest(config)) {
      return Promise.reject(error)
    }

    // si otro request ya refrescó la sesión mientras este estaba en vuelo, solo se reintenta
    const sentToken = config.headers.get('Authorization')
    if (sentToken === bearer(session.accessToken)) {
      try {
        await refreshSession(client, session.refreshToken)
      } catch {
        // refresh vencido o inválido: sin sesión, RequireAuth lleva al login
        clearSession()
        return Promise.reject(error)
      }
    }

    config._retried = true
    // el interceptor de request pone el access token nuevo
    return client.request(config)
  })
}
