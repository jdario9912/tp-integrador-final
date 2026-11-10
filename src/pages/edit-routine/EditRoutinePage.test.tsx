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
import { getRoutine } from '../../lib/routines/get-routine'
import { paths, routineEditPath } from '../../router/paths'
import { session } from '../../test/auth-fixtures'
import { routineDetail } from '../../test/routine-fixtures'
import { updateRoutine } from './actions/update-routine'
import { EditRoutinePage } from './EditRoutinePage'

vi.mock('../../lib/routines/get-routine', () => ({ getRoutine: vi.fn() }))
vi.mock('./actions/update-routine', () => ({ updateRoutine: vi.fn() }))

// muestra el id y el state recibidos para verificar a dónde lleva la edición
function RoutineDetailStub() {
  const { id } = useParams()
  const { state } = useLocation()
  return (
    <p>
      detalle de rutina {id} {JSON.stringify(state)}
    </p>
  )
}

const volume = routineDetail({
  goal: 'Hipertrofia',
  daysPerWeek: 4,
  durationWeeks: 8,
  description: 'Bloque de acumulación',
})

const renderPage = () => {
  const router = createMemoryRouter(
    [
      { path: paths.editRoutine, element: <EditRoutinePage /> },
      { path: paths.routineDetail, element: <RoutineDetailStub /> },
      { path: paths.routines, element: <p>listado de rutinas</p> },
    ],
    { initialEntries: [routineEditPath(volume.id)] },
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

const save = () =>
  userEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }))

beforeEach(() => {
  vi.mocked(getRoutine).mockReset()
  vi.mocked(updateRoutine).mockReset()
  saveSession(session('COACH'))
})

describe('EditRoutinePage', () => {
  it('precarga los datos y vuelve al detalle con el aviso al guardar', async () => {
    vi.mocked(getRoutine).mockResolvedValue(volume)
    vi.mocked(updateRoutine).mockResolvedValue({
      ...volume,
      name: 'Fase de volumen II',
    })
    renderPage()

    expect(
      screen.getByRole('status', { name: 'Cargando rutina' }),
    ).toBeInTheDocument()
    expect(
      await screen.findByRole('heading', {
        name: 'Editar Fase de volumen',
        level: 1,
      }),
    ).toBeInTheDocument()
    expect(screen.getByLabelText(/Nombre/)).toHaveValue('Fase de volumen')
    expect(screen.getByLabelText('Días por semana')).toHaveValue(4)

    await userEvent.type(screen.getByLabelText(/Nombre/), ' II')
    await userEvent.clear(screen.getByLabelText('Objetivo'))
    await save()

    expect(
      await screen.findByText(
        `detalle de rutina ${volume.id} {"notice":"Guardaste los cambios de Fase de volumen II."}`,
      ),
    ).toBeInTheDocument()
    expect(updateRoutine).toHaveBeenCalledWith(volume.id, {
      name: 'Fase de volumen II',
      description: 'Bloque de acumulación',
      goal: null,
      daysPerWeek: 4,
      durationWeeks: 8,
      isTemplate: false,
    })
  })

  it('un nombre repetido se marca en el campo y no sale de la edición', async () => {
    vi.mocked(getRoutine).mockResolvedValue(volume)
    vi.mocked(updateRoutine).mockRejectedValue(
      new ApiError('Ya tiene una rutina llamada Fuerza 5x5', 409),
    )
    renderPage()

    const name = await screen.findByLabelText(/Nombre/)
    await userEvent.clear(name)
    await userEvent.type(name, 'fuerza 5x5')
    await save()

    expect(
      await screen.findByText('Ya tiene una rutina llamada Fuerza 5x5'),
    ).toBeInTheDocument()
    expect(name).toHaveAttribute('aria-invalid', 'true')
  })

  it('cancelar vuelve al detalle sin guardar', async () => {
    vi.mocked(getRoutine).mockResolvedValue(volume)
    renderPage()

    await userEvent.click(
      await screen.findByRole('button', { name: 'Cancelar' }),
    )

    expect(
      screen.getByText(`detalle de rutina ${volume.id} null`),
    ).toBeInTheDocument()
    expect(updateRoutine).not.toHaveBeenCalled()
  })

  it.each([
    [403, 'No tenés acceso a esta rutina'],
    [404, 'La rutina no existe'],
  ])('ante un %i muestra el aviso', async (status, title) => {
    vi.mocked(getRoutine).mockRejectedValue(new ApiError('error', status))
    renderPage()

    expect(
      await screen.findByRole('heading', { name: title }),
    ).toBeInTheDocument()
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
  })

  it('permite reintentar ante otros errores', async () => {
    vi.mocked(getRoutine)
      .mockRejectedValueOnce(new ApiError('No se pudo conectar', 0))
      .mockResolvedValueOnce(volume)
    renderPage()

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No se pudo conectar',
    )
    await userEvent.click(screen.getByRole('button', { name: /Reintentar/ }))
    expect(await screen.findByLabelText(/Nombre/)).toHaveValue(
      'Fase de volumen',
    )
  })
})
