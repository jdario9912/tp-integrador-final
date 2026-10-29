import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {
  createMemoryRouter,
  parsePath,
  RouterProvider,
  type RouterProviderProps,
} from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../../lib/api'
import { saveSession } from '../../lib/auth'
import { paths } from '../../router/paths'
import { athletesPage, createdAthlete } from '../../test/athlete-fixtures'
import { session } from '../../test/auth-fixtures'
import { getAthletes } from './actions/get-athletes'
import { AthletesPage } from './AthletesPage'

vi.mock('./actions/get-athletes', () => ({ getAthletes: vi.fn() }))

let router: RouterProviderProps['router']

const renderPage = (url: string = paths.athletes, state?: unknown) => {
  router = createMemoryRouter(
    [
      { path: paths.athletes, element: <AthletesPage /> },
      { path: paths.newAthlete, element: <p>alta de atleta</p> },
    ],
    { initialEntries: [{ ...parsePath(url), state }] },
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

const juana = createdAthlete({ id: '1', firstName: 'Juana', lastName: 'Pérez' })
const lucas = createdAthlete({ id: '2', firstName: 'Lucas', lastName: 'Gómez' })

beforeEach(() => {
  vi.mocked(getAthletes).mockReset()
  saveSession(session('COACH'))
})

describe('AthletesPage', () => {
  it('lista los atletas de la primera página', async () => {
    vi.mocked(getAthletes).mockResolvedValue(athletesPage([juana, lucas]))

    renderPage()

    expect(
      screen.getByRole('heading', { name: 'Atletas', level: 1 }),
    ).toBeInTheDocument()
    expect(
      await screen.findByRole('region', { name: 'Juana Pérez' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('region', { name: 'Lucas Gómez' }),
    ).toBeInTheDocument()
    expect(getAthletes).toHaveBeenCalledWith({
      page: 1,
      name: undefined,
      goal: undefined,
    })
    // una sola página: sin paginador
    expect(
      screen.queryByRole('navigation', { name: 'Paginación' }),
    ).not.toBeInTheDocument()
  })

  it('busca por nombre después de dejar de escribir', async () => {
    vi.mocked(getAthletes).mockResolvedValue(athletesPage([juana]))
    const user = userEvent.setup()
    renderPage()
    await screen.findByRole('region', { name: 'Juana Pérez' })

    await user.type(
      screen.getByRole('searchbox', { name: 'Buscar por nombre' }),
      'jua',
    )

    await waitFor(() =>
      expect(getAthletes).toHaveBeenLastCalledWith({
        page: 1,
        name: 'jua',
        goal: undefined,
      }),
    )
    // no se pide una vez por tecla
    expect(getAthletes).toHaveBeenCalledTimes(2)
    expect(currentSearch()).toBe('name=jua')
  })

  it('combina la búsqueda por nombre y por objetivo', async () => {
    vi.mocked(getAthletes).mockResolvedValue(athletesPage([juana]))
    const user = userEvent.setup()
    renderPage()

    await user.type(
      screen.getByRole('searchbox', { name: 'Buscar por nombre' }),
      'jua',
    )
    await user.type(
      screen.getByRole('searchbox', { name: 'Buscar por objetivo' }),
      'fuerza',
    )

    await waitFor(() =>
      expect(getAthletes).toHaveBeenLastCalledWith({
        page: 1,
        name: 'jua',
        goal: 'fuerza',
      }),
    )
  })

  it('al buscar vuelve a la primera página', async () => {
    vi.mocked(getAthletes).mockResolvedValue(
      athletesPage([juana], { page: 1, totalPages: 3, totalElements: 45 }),
    )
    const user = userEvent.setup()
    renderPage(`${paths.athletes}?page=2`)
    await screen.findByRole('region', { name: 'Juana Pérez' })

    await user.type(
      screen.getByRole('searchbox', { name: 'Buscar por nombre' }),
      'lu',
    )

    await waitFor(() => expect(currentSearch()).toBe('name=lu'))
    expect(getAthletes).toHaveBeenLastCalledWith({
      page: 1,
      name: 'lu',
      goal: undefined,
    })
  })

  it('pagina con Siguiente y Anterior y guarda la página en la URL', async () => {
    vi.mocked(getAthletes).mockImplementation(async ({ page }) =>
      athletesPage([page === 1 ? juana : lucas], {
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
    expect(pagination).toHaveTextContent('Página 1 de 3 · 45 atletas')

    await user.click(
      within(pagination).getByRole('button', { name: 'Siguiente' }),
    )

    expect(
      await screen.findByRole('region', { name: 'Lucas Gómez' }),
    ).toBeInTheDocument()
    expect(getAthletes).toHaveBeenLastCalledWith({
      page: 2,
      name: undefined,
      goal: undefined,
    })
    expect(currentSearch()).toBe('page=2')

    await user.click(screen.getByRole('button', { name: 'Anterior' }))

    expect(
      await screen.findByRole('region', { name: 'Juana Pérez' }),
    ).toBeInTheDocument()
    expect(currentSearch()).toBe('')
  })

  it('toma la página y los filtros de la URL al entrar', async () => {
    vi.mocked(getAthletes).mockResolvedValue(
      athletesPage([juana], { page: 1, totalPages: 2, totalElements: 21 }),
    )

    renderPage(`${paths.athletes}?page=2&name=ana&goal=fuerza`)

    expect(
      screen.getByRole('searchbox', { name: 'Buscar por nombre' }),
    ).toHaveValue('ana')
    expect(
      screen.getByRole('searchbox', { name: 'Buscar por objetivo' }),
    ).toHaveValue('fuerza')
    await waitFor(() =>
      expect(getAthletes).toHaveBeenCalledWith({
        page: 2,
        name: 'ana',
        goal: 'fuerza',
      }),
    )
  })

  it('lleva a la última página si la pedida no existe', async () => {
    vi.mocked(getAthletes).mockImplementation(async ({ page }) =>
      athletesPage(page > 3 ? [] : [lucas], {
        page: page - 1,
        totalPages: 3,
        totalElements: 45,
      }),
    )

    renderPage(`${paths.athletes}?page=99`)

    expect(
      await screen.findByRole('region', { name: 'Lucas Gómez' }),
    ).toBeInTheDocument()
    expect(currentSearch()).toBe('page=3')
    expect(
      screen.queryByRole('heading', { name: 'Todavía no tenés atletas' }),
    ).not.toBeInTheDocument()
  })

  it('al volver atrás restaura la búsqueda en el input', async () => {
    vi.mocked(getAthletes).mockResolvedValue(athletesPage([juana]))
    renderPage(`${paths.athletes}?name=jua`)
    await screen.findByRole('region', { name: 'Juana Pérez' })

    await router.navigate(`${paths.athletes}?name=lu`)
    await waitFor(() =>
      expect(
        screen.getByRole('searchbox', { name: 'Buscar por nombre' }),
      ).toHaveValue('lu'),
    )
    await router.navigate(-1)

    await waitFor(() =>
      expect(
        screen.getByRole('searchbox', { name: 'Buscar por nombre' }),
      ).toHaveValue('jua'),
    )
    // el debounce no vuelve a escribir la búsqueda anterior en la URL
    await new Promise((resolve) => setTimeout(resolve, 400))
    expect(currentSearch()).toBe('name=jua')
  })

  it('muestra el error y reintenta', async () => {
    vi.mocked(getAthletes)
      .mockRejectedValueOnce(new ApiError('Ocurrió un error inesperado', 500))
      .mockResolvedValueOnce(athletesPage([juana]))
    const user = userEvent.setup()
    renderPage()

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Ocurrió un error inesperado',
    )

    await user.click(screen.getByRole('button', { name: 'Reintentar' }))

    expect(
      await screen.findByRole('region', { name: 'Juana Pérez' }),
    ).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('el botón Agregar atleta lleva al alta', async () => {
    vi.mocked(getAthletes).mockResolvedValue(athletesPage([juana]))
    const user = userEvent.setup()
    renderPage()

    await user.click(screen.getByRole('button', { name: 'Agregar atleta' }))

    expect(screen.getByText('alta de atleta')).toBeInTheDocument()
  })

  it('muestra el aviso de la edición y lo limpia sin perder los filtros', async () => {
    vi.mocked(getAthletes).mockResolvedValue(athletesPage([juana]))

    renderPage(`${paths.athletes}?name=jua`, {
      notice: 'Desvinculaste a Lucas Gómez.',
    })

    expect(
      await screen.findByText('Desvinculaste a Lucas Gómez.'),
    ).toBeInTheDocument()
    await waitFor(() => expect(router.state.location.state).toBeNull())
    expect(currentSearch()).toBe('name=jua')
  })
})
