import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
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
import { exerciseEditPath, paths } from '../../router/paths'
import { session } from '../../test/auth-fixtures'
import { createdExercise, muscleGroups } from '../../test/exercise-fixtures'
import { deleteExercise } from './actions/delete-exercise'
import { getExercise } from './actions/get-exercise'
import { updateExercise } from './actions/update-exercise'
import { EditExercisePage } from './EditExercisePage'

vi.mock('./actions/get-exercise', () => ({ getExercise: vi.fn() }))
vi.mock('./actions/update-exercise', () => ({ updateExercise: vi.fn() }))
vi.mock('./actions/delete-exercise', () => ({ deleteExercise: vi.fn() }))
vi.mock('../../lib/exercises/get-muscle-groups', () => ({
  getMuscleGroups: vi.fn(),
}))

// muestra el state recibido para verificar el aviso que se envía al listado
function ExercisesStub() {
  const { state } = useLocation()
  return <p>listado de ejercicios {JSON.stringify(state)}</p>
}

const press = createdExercise({ description: 'Agarre medio' })

const renderPage = () => {
  const router = createMemoryRouter(
    [
      { path: paths.editExercise, element: <EditExercisePage /> },
      { path: paths.exercises, element: <ExercisesStub /> },
    ],
    { initialEntries: [exerciseEditPath(press.id)] },
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
  vi.mocked(getExercise).mockReset()
  vi.mocked(updateExercise).mockReset()
  vi.mocked(deleteExercise).mockReset()
  vi.mocked(getMuscleGroups).mockReset()
  vi.mocked(getMuscleGroups).mockResolvedValue(muscleGroups)
  saveSession(session('COACH'))
})

describe('EditExercisePage', () => {
  it('pide el ejercicio de la URL y precarga el formulario', async () => {
    vi.mocked(getExercise).mockResolvedValue(press)

    renderPage()

    expect(screen.getByRole('status', { name: 'Cargando ejercicio' }))
    expect(
      await screen.findByRole('heading', {
        name: 'Editar Press de banca',
        level: 1,
      }),
    ).toBeInTheDocument()
    expect(getExercise).toHaveBeenCalledWith(press.id)
    expect(screen.getByLabelText(/Grupo muscular/)).toHaveValue('CHEST')
    expect(screen.getByLabelText('Descripción')).toHaveValue('Agarre medio')
  })

  it.each([
    [404, 'Ejercicio no encontrado'],
    [403, 'No tenés acceso a este ejercicio'],
  ])('muestra el mensaje del backend ante un %i', async (status, message) => {
    vi.mocked(getExercise).mockRejectedValue(new ApiError(message, status))

    renderPage()

    expect(
      await screen.findByText('No encontramos este ejercicio'),
    ).toBeInTheDocument()
    expect(screen.getByText(message)).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: /Reintentar/ }),
    ).not.toBeInTheDocument()
  })

  it('permite reintentar ante otros errores', async () => {
    vi.mocked(getExercise)
      .mockRejectedValueOnce(new ApiError('No se pudo conectar', 0))
      .mockResolvedValueOnce(press)

    renderPage()

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No se pudo conectar',
    )
    await userEvent.click(screen.getByRole('button', { name: /Reintentar/ }))
    expect(
      await screen.findByRole('heading', { name: 'Editar Press de banca' }),
    ).toBeInTheDocument()
  })

  it('un ejercicio global se muestra en modo lectura, sin formulario ni baja', async () => {
    vi.mocked(getExercise).mockResolvedValue({ ...press, global: true })

    renderPage()

    expect(
      await screen.findByRole('heading', { name: 'Press de banca', level: 1 }),
    ).toBeInTheDocument()
    expect(screen.getByRole('note')).toHaveTextContent(
      'no editarlo ni eliminarlo',
    )
    expect(screen.getByText('Pecho')).toBeInTheDocument()
    expect(screen.getByText('Agarre medio')).toBeInTheDocument()
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: /Eliminar/ }),
    ).not.toBeInTheDocument()
  })

  it('guarda los cambios y vuelve al listado con el aviso', async () => {
    vi.mocked(getExercise).mockResolvedValue(press)
    vi.mocked(updateExercise).mockResolvedValue({
      ...press,
      name: 'Press inclinado',
      description: null,
    })

    renderPage()

    const name = await screen.findByLabelText(/Nombre/)
    await userEvent.clear(name)
    await userEvent.type(name, 'Press inclinado')
    await userEvent.clear(screen.getByLabelText('Descripción'))
    await userEvent.click(
      screen.getByRole('button', { name: 'Guardar cambios' }),
    )

    expect(
      await screen.findByText(
        'listado de ejercicios {"notice":"Guardaste los cambios de Press inclinado."}',
      ),
    ).toBeInTheDocument()
    expect(updateExercise).toHaveBeenCalledWith(press.id, {
      name: 'Press inclinado',
      muscleGroup: 'CHEST',
      description: null,
      videoUrl: null,
    })
  })

  it('muestra el mensaje del backend si el nombre ya existe', async () => {
    vi.mocked(getExercise).mockResolvedValue(press)
    vi.mocked(updateExercise).mockRejectedValue(
      new ApiError('Ya tenés un ejercicio llamado Press de banca', 409),
    )

    renderPage()

    await userEvent.click(
      await screen.findByRole('button', { name: 'Guardar cambios' }),
    )

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Ya tenés un ejercicio llamado Press de banca',
    )
  })

  it('cancelar la baja no la ejecuta', async () => {
    vi.mocked(getExercise).mockResolvedValue(press)

    renderPage()

    await userEvent.click(
      await screen.findByRole('button', { name: /Eliminar/ }),
    )
    await userEvent.click(
      within(screen.getByRole('dialog')).getByRole('button', {
        name: 'Cancelar',
      }),
    )

    expect(deleteExercise).not.toHaveBeenCalled()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('elimina tras confirmar y vuelve al listado con el aviso', async () => {
    vi.mocked(getExercise).mockResolvedValue(press)
    vi.mocked(deleteExercise).mockResolvedValue(undefined)

    renderPage()

    await userEvent.click(
      await screen.findByRole('button', { name: /Eliminar/ }),
    )
    const dialog = screen.getByRole('dialog', {
      name: '¿Eliminar Press de banca?',
    })
    expect(dialog).toHaveAccessibleDescription(
      'Deja de aparecer en tu catálogo. Las rutinas que ya lo usan no se modifican.',
    )
    await userEvent.click(
      within(dialog).getByRole('button', { name: 'Eliminar' }),
    )

    expect(
      await screen.findByText(
        'listado de ejercicios {"notice":"Eliminaste el ejercicio Press de banca."}',
      ),
    ).toBeInTheDocument()
    expect(deleteExercise).toHaveBeenCalledWith(press.id)
    // no vuelve a pedir el detalle: respondería 404
    expect(getExercise).toHaveBeenCalledTimes(1)
  })

  it('muestra el error de la baja', async () => {
    vi.mocked(getExercise).mockResolvedValue(press)
    vi.mocked(deleteExercise).mockRejectedValue(
      new ApiError('No tenés acceso a este ejercicio', 403),
    )

    renderPage()

    await userEvent.click(
      await screen.findByRole('button', { name: /Eliminar/ }),
    )
    await userEvent.click(
      within(screen.getByRole('dialog')).getByRole('button', {
        name: 'Eliminar',
      }),
    )

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No tenés acceso a este ejercicio',
    )
    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
    )
  })
})
