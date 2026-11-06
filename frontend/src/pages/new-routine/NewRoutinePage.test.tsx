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
  useParams,
} from '../../lib/navigation'
import { paths } from '../../router/paths'
import { session } from '../../test/auth-fixtures'
import { createdRoutine } from '../../test/routine-fixtures'
import { createRoutine } from './actions/create-routine'
import { NewRoutinePage } from './NewRoutinePage'

vi.mock('./actions/create-routine', () => ({ createRoutine: vi.fn() }))

// muestra el id y el state recibidos para verificar a dónde lleva el alta
function RoutineDetailStub() {
  const { id } = useParams()
  const { state } = useLocation()
  return (
    <p>
      detalle de rutina {id} {JSON.stringify(state)}
    </p>
  )
}

const renderPage = () => {
  const router = createMemoryRouter(
    [
      { path: paths.newRoutine, element: <NewRoutinePage /> },
      { path: paths.routines, element: <p>listado de rutinas</p> },
      { path: paths.routineDetail, element: <RoutineDetailStub /> },
    ],
    { initialEntries: [paths.newRoutine] },
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

const submit = () =>
  userEvent.click(screen.getByRole('button', { name: 'Crear rutina' }))

beforeEach(() => {
  vi.mocked(createRoutine).mockReset()
  saveSession(session('COACH'))
})

describe('NewRoutinePage', () => {
  it('crea la rutina y lleva a su detalle con el aviso', async () => {
    vi.mocked(createRoutine).mockResolvedValue(
      createdRoutine({ id: 'abc', name: 'Fase de volumen', daysPerWeek: 4 }),
    )
    renderPage()

    expect(
      screen.getByRole('heading', { name: 'Nueva rutina', level: 1 }),
    ).toBeInTheDocument()
    await userEvent.type(screen.getByLabelText(/Nombre/), ' Fase de volumen ')
    await userEvent.type(screen.getByLabelText('Días por semana'), '4')
    await submit()

    expect(
      await screen.findByText(
        'detalle de rutina abc {"notice":"Creaste la rutina Fase de volumen."}',
      ),
    ).toBeInTheDocument()
    expect(vi.mocked(createRoutine).mock.calls[0][0]).toEqual({
      name: 'Fase de volumen',
      description: null,
      goal: null,
      daysPerWeek: 4,
      durationWeeks: null,
      isTemplate: false,
    })
  })

  it('si el nombre ya existe lo marca en el campo y no sale del alta', async () => {
    vi.mocked(createRoutine).mockRejectedValue(
      new ApiError('Ya tiene una rutina llamada Fase de volumen', 409),
    )
    renderPage()

    await userEvent.type(screen.getByLabelText(/Nombre/), 'fase de volumen')
    await submit()

    expect(
      await screen.findByText('Ya tiene una rutina llamada Fase de volumen'),
    ).toBeInTheDocument()
    expect(screen.getByLabelText(/Nombre/)).toHaveAttribute(
      'aria-invalid',
      'true',
    )
    expect(
      screen.getByRole('heading', { name: 'Nueva rutina' }),
    ).toBeInTheDocument()
  })

  it('cancelar vuelve al listado sin crear', async () => {
    renderPage()

    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }))

    expect(screen.getByText('listado de rutinas')).toBeInTheDocument()
    expect(createRoutine).not.toHaveBeenCalled()
  })
})
