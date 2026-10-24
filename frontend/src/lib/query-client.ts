import { QueryClient } from '@tanstack/react-query'
import { isApiError } from './api'

const MAX_QUERY_RETRIES = 1

// un 4xx (401, 403, 404, validación) no cambia al reintentar; un 5xx o un corte de red puede que sí
export const shouldRetryQuery = (failureCount: number, error: unknown) =>
  failureCount < MAX_QUERY_RETRIES &&
  !(isApiError(error) && error.status >= 400 && error.status < 500)

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: shouldRetryQuery, refetchOnWindowFocus: false },
    // reintentar una mutación podría duplicar el recurso (ej. doble registro)
    mutations: { retry: false },
  },
})
