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
import { paths } from '../../router/paths'
import { session } from '../../test/auth-fixtures'
import { createdFood } from '../../test/food-fixtures'
import { createFood } from './actions/create-food'
import { NewFoodPage } from './NewFoodPage'

vi.mock('./actions/create-food', () => ({ createFood: vi.fn() }))

// muestra el state recibido para verificar el aviso que se envía al listado
function FoodsStub() {
  const { state } = useLocation()
  return <p>listado de alimentos {JSON.stringify(state)}</p>
}

const renderPage = () => {
  const router = createMemoryRouter(
    [
      { path: paths.newFood, element: <NewFoodPage /> },
      { path: paths.foods, element: <FoodsStub /> },
    ],
    { initialEntries: [paths.newFood] },
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

const fillForm = async () => {
  await userEvent.type(await screen.findByLabelText(/Nombre/), ' Avena ')
  await userEvent.type(screen.getByLabelText(/Porción de referencia/), '40')
  await userEvent.type(screen.getByLabelText(/Calorías/), '150.4')
  await userEvent.type(screen.getByLabelText(/Proteínas/), '5')
  await userEvent.type(screen.getByLabelText(/Carbohidratos/), '27')
  await userEvent.type(screen.getByLabelText(/Grasas/), '2.5')
}

const submit = () =>
  userEvent.click(screen.getByRole('button', { name: 'Crear alimento' }))

beforeEach(() => {
  vi.mocked(createFood).mockReset()
  saveSession(session('COACH'))
})

describe('NewFoodPage', () => {
  it('crea el alimento y vuelve al listado con el aviso', async () => {
    vi.mocked(createFood).mockResolvedValue(createdFood({ name: 'Avena' }))
    renderPage()

    await fillForm()
    await submit()

    expect(
      await screen.findByText(
        'listado de alimentos {"notice":"Creaste el alimento Avena."}',
      ),
    ).toBeInTheDocument()
    expect(vi.mocked(createFood).mock.calls[0][0]).toEqual({
      name: 'Avena',
      referencePortionG: 40,
      caloriesKcal: 150.4,
      proteinG: 5,
      carbsG: 27,
      fatG: 2.5,
    })
  })

  it('si el nombre ya existe lo muestra en el campo', async () => {
    vi.mocked(createFood).mockRejectedValue(
      new ApiError('Ya existe un alimento llamado Avena en el catálogo', 409),
    )
    renderPage()

    await fillForm()
    await submit()

    expect(
      await screen.findByText(
        'Ya existe un alimento llamado Avena en el catálogo',
      ),
    ).toBeInTheDocument()
    expect(screen.getByLabelText(/Nombre/)).toHaveAttribute(
      'aria-invalid',
      'true',
    )
  })

  it('cancelar vuelve al listado sin crear', async () => {
    renderPage()

    await userEvent.click(
      await screen.findByRole('button', { name: 'Cancelar' }),
    )

    expect(screen.getByText('listado de alimentos null')).toBeInTheDocument()
    expect(createFood).not.toHaveBeenCalled()
  })
})
