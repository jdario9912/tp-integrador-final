import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../../lib/api'
import { saveSession } from '../../lib/auth'
import {
  createMemoryRouter,
  RouterProvider,
  useLocation,
} from '../../lib/navigation'
import { foodEditPath, paths } from '../../router/paths'
import { session } from '../../test/auth-fixtures'
import { createdFood } from '../../test/food-fixtures'
import { getFood } from './actions/get-food'
import { updateFood } from './actions/update-food'
import { EditFoodPage } from './EditFoodPage'

vi.mock('./actions/get-food', () => ({ getFood: vi.fn() }))
vi.mock('./actions/update-food', () => ({ updateFood: vi.fn() }))

// muestra el state recibido para verificar el aviso que se envía al listado
function FoodsStub() {
  const { state } = useLocation()
  return <p>listado de alimentos {JSON.stringify(state)}</p>
}

const apple = createdFood()

const renderPage = () => {
  const router = createMemoryRouter(
    [
      { path: paths.editFood, element: <EditFoodPage /> },
      { path: paths.foods, element: <FoodsStub /> },
    ],
    { initialEntries: [foodEditPath(apple.id)] },
  )
  render(
    <QueryClientProvider
      client={
        new QueryClient({
          defaultOptions: {
            queries: { retry: false },
            mutations: { retry: false },
          },
        })
      }
    >
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  vi.mocked(getFood).mockReset()
  vi.mocked(updateFood).mockReset()
  saveSession(session('COACH'))
})

describe('EditFoodPage', () => {
  it('pide el alimento de la URL y precarga el formulario', async () => {
    vi.mocked(getFood).mockResolvedValue(apple)

    renderPage()

    expect(
      screen.getByRole('status', { name: 'Cargando alimento' }),
    ).toBeInTheDocument()
    expect(
      await screen.findByRole('heading', { name: 'Editar Manzana', level: 1 }),
    ).toBeInTheDocument()
    expect(getFood).toHaveBeenCalledWith(apple.id)
    expect(screen.getByLabelText(/Nombre/)).toHaveValue('Manzana')
    expect(screen.getByLabelText(/Calorías/)).toHaveValue(52)
  })

  it('guarda los cambios y vuelve al listado con el aviso', async () => {
    vi.mocked(getFood).mockResolvedValue(apple)
    vi.mocked(updateFood).mockResolvedValue(
      createdFood({ name: 'Manzana verde', caloriesKcal: 48 }),
    )
    renderPage()

    const name = await screen.findByLabelText(/Nombre/)
    await userEvent.clear(name)
    await userEvent.type(name, 'Manzana verde')
    await userEvent.clear(screen.getByLabelText(/Calorías/))
    await userEvent.type(screen.getByLabelText(/Calorías/), '48')
    await userEvent.click(
      screen.getByRole('button', { name: 'Guardar cambios' }),
    )

    expect(
      await screen.findByText(
        'listado de alimentos {"notice":"Guardaste los cambios de Manzana verde."}',
      ),
    ).toBeInTheDocument()
    expect(updateFood).toHaveBeenCalledWith(apple.id, {
      name: 'Manzana verde',
      referencePortionG: 100,
      caloriesKcal: 48,
      proteinG: 0.3,
      carbsG: 14,
      fatG: 0.2,
    })
  })

  it('si el alimento no existe (404) muestra el aviso con la salida al listado', async () => {
    vi.mocked(getFood).mockRejectedValue(
      new ApiError(`No existe el alimento con id ${apple.id}`, 404),
    )

    renderPage()

    expect(
      await screen.findByRole('heading', {
        name: 'No encontramos este alimento',
      }),
    ).toBeInTheDocument()
    expect(
      screen.getByText(`No existe el alimento con id ${apple.id}`),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: 'Volver a alimentos' }),
    ).toHaveAttribute('href', paths.foods)
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
  })

  it('ante otro error permite reintentar', async () => {
    vi.mocked(getFood)
      .mockRejectedValueOnce(
        new ApiError('No se pudo conectar con el servidor', 0),
      )
      .mockResolvedValueOnce(apple)
    renderPage()

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No se pudo conectar con el servidor',
    )
    await userEvent.click(screen.getByRole('button', { name: /Reintentar/ }))

    expect(
      await screen.findByRole('heading', { name: 'Editar Manzana', level: 1 }),
    ).toBeInTheDocument()
  })
})
