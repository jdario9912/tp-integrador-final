import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, refetchOnWindowFocus: false },
    // reintentar una mutación podría duplicar el recurso (ej. doble registro)
    mutations: { retry: false },
  },
})
