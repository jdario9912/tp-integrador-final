import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../../lib/api'
import { saveSession } from '../../lib/auth'
import { getMuscleGroups } from '../../lib/exercises/get-muscle-groups'
import {
  createMemoryRouter,
  RouterProvider,
  useLocation,
} from '../../lib/navigation'
import { paths } from '../../router/paths'
import { session } from '../../test/auth-fixtures'
import { createdExercise, muscleGroups } from '../../test/exercise-fixtures'
import { createExercise } from './actions/create-exercise'
import { NewExercisePage } from './NewExercisePage'

vi.mock('./actions/create-exercise', () => ({ createExercise: vi.fn() }))
vi.mock('../../lib/exercises/get-muscle-groups', () => ({
  getMuscleGroups: vi.fn(),
}))

// muestra el state recibido para verificar el aviso que se envía al listado
function ExercisesStub() {
  const { state } = useLocation()
  return <p>listado de ejercicios {JSON.stringify(state)}</p>
}

const renderPage = () => {
  const router = createMemoryRouter(
    [
      { path: paths.newExercise, element: <NewExercisePage /> },
      { path: paths.exercises, element: <ExercisesStub /> },
    ],
    { initialEntries: [paths.newExercise] },
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
  await userEvent.type(await screen.findByLabelText(/Nombre/), ' Hip thrust ')
  await userEvent.selectOptions(
    screen.getByLabelText(/Grupo muscular/),
    'GLUTES',
  )
}

const submit = () =>
  userEvent.click(screen.getByRole('button', { name: 'Crear ejercicio' }))

beforeEach(() => {
  vi.mocked(createExercise).mockReset()
  vi.mocked(getMuscleGroups).mockReset()
  vi.mocked(getMuscleGroups).mockResolvedValue(muscleGroups)
  saveSession(session('COACH'))
})

describe('NewExercisePage', () => {
  it('crea el ejercicio y vuelve al listado con el aviso', async () => {
    vi.mocked(createExercise).mockResolvedValue(
      createdExercise({ name: 'Hip thrust', muscleGroup: 'GLUTES' }),
    )
    renderPage()

    await fillForm()
    await submit()

    expect(
      await screen.findByText(
        'listado de ejercicios {"notice":"Creaste el ejercicio Hip thrust."}',
      ),
    ).toBeInTheDocument()
    expect(vi.mocked(createExercise).mock.calls[0][0]).toEqual({
      name: 'Hip thrust',
      muscleGroup: 'GLUTES',
      description: null,
      videoUrl: null,
    })
  })

  it('muestra el mensaje del backend si el nombre ya existe', async () => {
    vi.mocked(createExercise).mockRejectedValue(
      new ApiError('Ya tenés un ejercicio llamado Hip thrust', 409),
    )
    renderPage()

    await fillForm()
    await submit()

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Ya tenés un ejercicio llamado Hip thrust',
    )
  })

  it('cancelar vuelve al listado sin crear', async () => {
    renderPage()

    await userEvent.click(
      await screen.findByRole('button', { name: 'Cancelar' }),
    )

    expect(screen.getByText('listado de ejercicios null')).toBeInTheDocument()
    expect(createExercise).not.toHaveBeenCalled()
  })

  it('si no carga el catálogo de grupos permite reintentar', async () => {
    vi.mocked(getMuscleGroups)
      .mockRejectedValueOnce(
        new ApiError('No se pudo conectar con el servidor', 0),
      )
      .mockResolvedValueOnce(muscleGroups)
    renderPage()

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No se pudo conectar con el servidor',
    )
    await userEvent.click(screen.getByRole('button', { name: /Reintentar/ }))

    await waitFor(() =>
      expect(screen.getByLabelText(/Grupo muscular/)).toBeInTheDocument(),
    )
  })
})
