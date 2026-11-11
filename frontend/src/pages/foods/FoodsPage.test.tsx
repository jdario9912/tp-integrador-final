import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
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
import { createdFood, foodsPage } from '../../test/food-fixtures'
import { getFoods } from './actions/get-foods'
import { FoodsPage } from './FoodsPage'

vi.mock('./actions/get-foods', () => ({ getFoods: vi.fn() }))

let router: RouterProviderProps['router']

const renderPage = (url: string = paths.foods, state?: unknown) => {
  router = createMemoryRouter(
    [
      { path: paths.foods, element: <FoodsPage /> },
      { path: paths.newFood, element: <p>alta de alimento</p> },
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

const apple = createdFood({ id: '1', name: 'Manzana' })
const rice = createdFood({ id: '2', name: 'Arroz blanco', caloriesKcal: 130 })

beforeEach(() => {
  vi.mocked(getFoods).mockReset()
  saveSession(session('COACH'))
})

describe('FoodsPage', () => {
  it('lista los alimentos de la primera página', async () => {
    vi.mocked(getFoods).mockResolvedValue(foodsPage([rice, apple]))

    renderPage()

    expect(
      screen.getByRole('heading', { name: 'Alimentos', level: 1 }),
    ).toBeInTheDocument()
    expect(
      await screen.findByRole('region', { name: 'Arroz blanco' }),
    ).toHaveTextContent('130 kcal')
    expect(screen.getByRole('region', { name: 'Manzana' })).toBeInTheDocument()
    expect(getFoods).toHaveBeenCalledWith({ page: 1, name: undefined })
  })

  it('busca por nombre después de dejar de escribir', async () => {
    vi.mocked(getFoods).mockResolvedValue(foodsPage([apple]))
    const user = userEvent.setup()
    renderPage()
    await screen.findByRole('region', { name: 'Manzana' })

    await user.type(
      screen.getByRole('searchbox', { name: 'Buscar por nombre' }),
      'man',
    )

    await waitFor(() =>
      expect(getFoods).toHaveBeenLastCalledWith({ page: 1, name: 'man' }),
    )
    // no se pide una vez por tecla
    expect(getFoods).toHaveBeenCalledTimes(2)
    expect(currentSearch()).toBe('name=man')
  })

  it('una búsqueda nueva vuelve a la página 1', async () => {
    vi.mocked(getFoods).mockResolvedValue(
      foodsPage([apple], { page: 1, totalPages: 3, totalElements: 45 }),
    )
    const user = userEvent.setup()
    renderPage(`${paths.foods}?page=2`)
    await screen.findByRole('region', { name: 'Manzana' })

    await user.type(
      screen.getByRole('searchbox', { name: 'Buscar por nombre' }),
      'arroz',
    )

    await waitFor(() => expect(currentSearch()).toBe('name=arroz'))
  })

  it('toma la página y la búsqueda de la URL al entrar', async () => {
    vi.mocked(getFoods).mockResolvedValue(
      foodsPage([apple], { page: 1, totalPages: 2, totalElements: 21 }),
    )

    renderPage(`${paths.foods}?page=2&name=man`)

    expect(
      screen.getByRole('searchbox', { name: 'Buscar por nombre' }),
    ).toHaveValue('man')
    await waitFor(() =>
      expect(getFoods).toHaveBeenCalledWith({ page: 2, name: 'man' }),
    )
  })

  it('pagina con Siguiente y guarda la página en la URL', async () => {
    vi.mocked(getFoods).mockImplementation(async ({ page }) =>
      foodsPage([page === 1 ? rice : apple], {
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
    expect(pagination).toHaveTextContent('Página 1 de 3 · 45 alimentos')

    await user.click(
      within(pagination).getByRole('button', { name: 'Siguiente' }),
    )

    expect(
      await screen.findByRole('region', { name: 'Manzana' }),
    ).toBeInTheDocument()
    expect(currentSearch()).toBe('page=2')
  })

  it('lleva a la última página si la pedida no existe', async () => {
    vi.mocked(getFoods).mockImplementation(async ({ page }) =>
      foodsPage(page > 3 ? [] : [apple], {
        page: page - 1,
        totalPages: 3,
        totalElements: 45,
      }),
    )

    renderPage(`${paths.foods}?page=99`)

    expect(
      await screen.findByRole('region', { name: 'Manzana' }),
    ).toBeInTheDocument()
    expect(currentSearch()).toBe('page=3')
  })

  it('muestra el error y reintenta', async () => {
    vi.mocked(getFoods)
      .mockRejectedValueOnce(new ApiError('Ocurrió un error inesperado', 500))
      .mockResolvedValueOnce(foodsPage([apple]))
    const user = userEvent.setup()
    renderPage()

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Ocurrió un error inesperado',
    )
    await user.click(screen.getByRole('button', { name: 'Reintentar' }))

    expect(
      await screen.findByRole('region', { name: 'Manzana' }),
    ).toBeInTheDocument()
  })

  it('el entrenador ve Nuevo alimento y Editar', async () => {
    vi.mocked(getFoods).mockResolvedValue(foodsPage([apple]))
    const user = userEvent.setup()
    renderPage()

    expect(
      await screen.findByRole('link', { name: 'Editar Manzana' }),
    ).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Nuevo alimento' }))

    expect(screen.getByText('alta de alimento')).toBeInTheDocument()
  })

  it('el atleta consulta el catálogo en modo lectura', async () => {
    saveSession(session('ATHLETE'))
    vi.mocked(getFoods).mockResolvedValue(foodsPage([apple]))

    renderPage()

    expect(
      await screen.findByRole('region', { name: 'Manzana' }),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Nuevo alimento' }),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('link', { name: /Editar/ }),
    ).not.toBeInTheDocument()
  })

  it('muestra el aviso del alta y lo limpia sin perder la búsqueda', async () => {
    vi.mocked(getFoods).mockResolvedValue(foodsPage([apple]))

    renderPage(`${paths.foods}?name=man`, {
      notice: 'Creaste el alimento Manzana.',
    })

    expect(
      await screen.findByText('Creaste el alimento Manzana.'),
    ).toBeInTheDocument()
    await waitFor(() => expect(router.state.location.state).toBeNull())
    expect(currentSearch()).toBe('name=man')
  })
})
