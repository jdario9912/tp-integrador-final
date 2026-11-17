import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render } from '@testing-library/react'
import { createElement, type ReactNode } from 'react'
import { createMemoryRouter, RouterProvider } from '../../lib/navigation'
import { paths } from '../../router/paths'
import { session } from '../../test/auth-fixtures'

// el atleta de la sesión de prueba: el id es el del usuario, igual que en las pantallas reales
export const ATHLETE_ID = session('ATHLETE').user.id

// renderiza la tarjeta con un router en memoria y devuelve el router, para comprobar a qué
// ruta se navegó. Las rutas de destino son páginas vacías: alcanza con saber la ruta
export function renderWithRouter(ui: ReactNode) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })
  const router = createMemoryRouter(
    [
      { path: paths.dashboard, element: ui },
      {
        path: paths.training,
        element: createElement('p', null, 'pantalla del entrenamiento'),
      },
      {
        path: paths.meals,
        element: createElement('p', null, 'pantalla de comidas'),
      },
      {
        path: paths.progress,
        element: createElement('p', null, 'pantalla de progreso'),
      },
      {
        path: paths.trainingHistory,
        element: createElement('p', null, 'pantalla de historial'),
      },
    ],
    { initialEntries: [paths.dashboard] },
  )
  render(
    createElement(
      QueryClientProvider,
      { client: queryClient },
      createElement(RouterProvider, { router }),
    ),
  )
  return router
}

// página de GET .../sessions o .../weights con los campos de PageResponse
export const pageOf = <T>(content: T[]) => ({
  content,
  page: 0,
  size: 20,
  totalElements: content.length,
  totalPages: content.length > 0 ? 1 : 0,
})
