import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../../lib/api'
import { saveSession } from '../../lib/auth'
import {
  createMemoryRouter,
  parsePath,
  RouterProvider,
  type RouterProviderProps,
} from '../../lib/navigation'
import { paths } from '../../router/paths'
import { session } from '../../test/auth-fixtures'
import { createdRoutine, routinesPage } from '../../test/routine-fixtures'
import { getRoutines } from './actions/get-routines'
import { RoutinesPage } from './RoutinesPage'

vi.mock('./actions/get-routines', () => ({ getRoutines: vi.fn() }))

let router: RouterProviderProps['router']

const renderPage = (url: string = paths.routines) => {
  router = createMemoryRouter(
    [
      { path: paths.routines, element: <RoutinesPage /> },
      { path: paths.newRoutine, element: <p>alta de rutina</p> },
      { path: paths.routineDetail, element: <p>detalle de rutina</p> },
    ],
    { initialEntries: [parsePath(url)] },
  )
  return render(
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { queries: { retry: false } } })
      }
    >
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
}

const currentSearch = () =>
  new URLSearchParams(router.state.location.search).toString()

const volume = createdRoutine({ id: '1', name: 'Fase de volumen' })
const strength = createdRoutine({ id: '2', name: 'Fuerza 5x5' })

beforeEach(() => {
  vi.mocked(getRoutines).mockReset()
  saveSession(session('COACH'))
})

describe('RoutinesPage', () => {
  it('lista las rutinas de la primera página', async () => {
    vi.mocked(getRoutines).mockResolvedValue(routinesPage([volume, strength]))

    renderPage()

    expect(
      screen.getByRole('heading', { name: 'Mis rutinas', level: 1 }),
    ).toBeInTheDocument()
    expect(
      await screen.findByRole('region', { name: 'Fase de volumen' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('region', { name: 'Fuerza 5x5' }),
    ).toBeInTheDocument()
    expect(getRoutines).toHaveBeenCalledWith({ page: 1 })
    // con una sola página no hay paginación
    expect(
      screen.queryByRole('navigation', { name: 'Paginación' }),
    ).not.toBeInTheDocument()
  })

  it('sin rutinas muestra el estado vacío', async () => {
    vi.mocked(getRoutines).mockResolvedValue(routinesPage([]))

    renderPage()

    expect(
      await screen.findByRole('heading', { name: 'Todavía no tenés rutinas' }),
    ).toBeInTheDocument()
  })

  it('toma la página de la URL al entrar', async () => {
    vi.mocked(getRoutines).mockResolvedValue(
      routinesPage([strength], { page: 1, totalPages: 2, totalElements: 21 }),
    )

    renderPage(`${paths.routines}?page=2`)

    expect(
      await screen.findByRole('region', { name: 'Fuerza 5x5' }),
    ).toBeInTheDocument()
    expect(getRoutines).toHaveBeenCalledWith({ page: 2 })
  })

  it('pagina con Siguiente y guarda la página en la URL', async () => {
    vi.mocked(getRoutines).mockImplementation(async ({ page }) =>
      routinesPage([page === 1 ? volume : strength], {
        page: page - 1,
        totalPages: 3,
        totalElements: 45,
      }),
    )
    const user = userEvent.setup()
    renderPage()
    const pagination = await screen.findByRole('navigation', {
      name: 'Paginación',
    })
    expect(pagination).toHaveTextContent('Página 1 de 3 · 45 rutinas')

    await user.click(
      within(pagination).getByRole('button', { name: 'Siguiente' }),
    )

    expect(
      await screen.findByRole('region', { name: 'Fuerza 5x5' }),
    ).toBeInTheDocument()
    expect(currentSearch()).toBe('page=2')
  })

  it('lleva a la última página si la pedida no existe', async () => {
    vi.mocked(getRoutines).mockImplementation(async ({ page }) =>
      routinesPage(page > 3 ? [] : [strength], {
        page: page - 1,
        totalPages: 3,
        totalElements: 45,
      }),
    )

    renderPage(`${paths.routines}?page=99`)

    expect(
      await screen.findByRole('region', { name: 'Fuerza 5x5' }),
    ).toBeInTheDocument()
    expect(currentSearch()).toBe('page=3')
  })

  it('muestra el error y reintenta', async () => {
    vi.mocked(getRoutines)
      .mockRejectedValueOnce(new ApiError('Ocurrió un error inesperado', 500))
      .mockResolvedValueOnce(routinesPage([volume]))
    const user = userEvent.setup()
    renderPage()

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Ocurrió un error inesperado',
    )
    await user.click(screen.getByRole('button', { name: 'Reintentar' }))

    expect(
      await screen.findByRole('region', { name: 'Fase de volumen' }),
    ).toBeInTheDocument()
  })

  it('el botón Nueva rutina lleva al alta', async () => {
    vi.mocked(getRoutines).mockResolvedValue(routinesPage([volume]))
    const user = userEvent.setup()
    renderPage()

    await user.click(screen.getByRole('button', { name: 'Nueva rutina' }))

    expect(screen.getByText('alta de rutina')).toBeInTheDocument()
  })

  it('el link de la card lleva al detalle', async () => {
    vi.mocked(getRoutines).mockResolvedValue(routinesPage([volume]))
    const user = userEvent.setup()
    renderPage()

    await user.click(
      await screen.findByRole('link', { name: 'Ver rutina Fase de volumen' }),
    )

    expect(screen.getByText('detalle de rutina')).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/routines/1')
  })
})
