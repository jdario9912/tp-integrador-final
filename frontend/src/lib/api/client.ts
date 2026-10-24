import axios, { type AxiosRequestConfig } from 'axios'
// import directo (no desde lib/auth): el index de auth usa este cliente y se generaría un ciclo
import { installAuthInterceptors } from '../auth/auth-interceptors'
import { ApiError, type ApiErrorResponse } from './api-error'

export const httpClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  headers: { 'Content-Type': 'application/json' },
})

// antes que el interceptor de errores: el refresh necesita el error de axios original
installAuthInterceptors(httpClient)

// normaliza cualquier error de axios a ApiError para que hooks y formularios manejen un único tipo
httpClient.interceptors.response.use(undefined, (error: unknown) => {
  if (!axios.isAxiosError<Partial<ApiErrorResponse>>(error)) {
    return Promise.reject(error)
  }

  const { response } = error
  if (!response) {
    // status 0: no hubo respuesta (red caída, CORS, servidor apagado)
    return Promise.reject(
      new ApiError('No se pudo conectar con el servidor', 0),
    )
  }

  const { data, status } = response
  return Promise.reject(
    new ApiError(data?.message ?? error.message, status, {
      path: data?.path,
      timestamp: data?.timestamp,
      fieldErrors: data?.fieldErrors,
    }),
  )
})

export const get = async <TResponse>(
  url: string,
  config?: AxiosRequestConfig,
) => (await httpClient.get<TResponse>(url, config)).data

export const post = async <TResponse, TBody = unknown>(
  url: string,
  body: TBody,
  config?: AxiosRequestConfig<TBody>,
) => (await httpClient.post<TResponse>(url, body, config)).data

export const put = async <TResponse, TBody = unknown>(
  url: string,
  body: TBody,
  config?: AxiosRequestConfig<TBody>,
) => (await httpClient.put<TResponse>(url, body, config)).data

export const patch = async <TResponse, TBody = unknown>(
  url: string,
  body: TBody,
  config?: AxiosRequestConfig<TBody>,
) => (await httpClient.patch<TResponse>(url, body, config)).data

// `delete` es palabra reservada
export const del = async <TResponse = void>(
  url: string,
  config?: AxiosRequestConfig,
) => (await httpClient.delete<TResponse>(url, config)).data
