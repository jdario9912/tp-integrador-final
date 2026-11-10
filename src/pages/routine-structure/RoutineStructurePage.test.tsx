import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../../lib/api'
import { saveSession } from '../../lib/auth'
import { getMuscleGroups } from '../../lib/exercises/get-muscle-groups'
import {
  createMemoryRouter,
  RouterProvider,
  useLocation,
  useParams,
} from '../../lib/navigation'
import { duplicateRoutine } from '../../lib/routines/duplicate-routine'
import { getRoutine } from '../../lib/routines/get-routine'
import { paths, routineStructurePath } from '../../router/paths'
import { session } from '../../test/auth-fixtures'
import {
  createdExercise,
  exercisesPage,
  muscleGroups,
} from '../../test/exercise-fixtures'
import {
  routineDay,
  routineDetail,
  routineExercise,
} from '../../test/routine-fixtures'
import { saveRoutineStructure } from './actions/save-routine-structure'
import { searchExercises } from './actions/search-exercises'
import { RoutineStructurePage } from './RoutineStructurePage'

vi.mock('../../lib/routines/get-routine', () => ({ getRoutine: vi.fn() }))
vi.mock('../../lib/routines/duplicate-routine', () => ({
  duplicateRoutine: vi.fn(),
}))
vi.mock('../../lib/exercises/get-muscle-groups', () => ({
  getMuscleGroups: vi.fn(),
}))
vi.mock('./actions/save-routine-structure', () => ({
  saveRoutineStructure: vi.fn(),
}))
vi.mock('./actions/search-exercises', () => ({ searchExercises: vi.fn() }))

// muestra el id y el state recibidos para verificar a dónde lleva la página
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
  days: [
    routineDay({
      exercises: [routineExercise({ rest: 90 })],
    }),
  ],
})

const renderPage = () => {
  const router = createMemoryRouter(
    [
      { path: paths.routineStructure, element: <RoutineStructurePage /> },
      { path: paths.routineDetail, element: <RoutineDetailStub /> },
      { path: paths.routines, element: <p>listado de rutinas</p> },
    ],
    { initialEntries: [routineStructurePath(volume.id)] },
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
  userEvent.click(screen.getByRole('button', { name: 'Guardar estructura' }))

beforeEach(() => {
  vi.mocked(getRoutine).mockReset()
  vi.mocked(saveRoutineStructure).mockReset()
  vi.mocked(duplicateRoutine).mockReset()
  vi.mocked(searchExercises).mockReset()
  vi.mocked(getMuscleGroups).mockResolvedValue(muscleGroups)
  saveSession(session('COACH'))
})

describe('RoutineStructurePage', () => {
  it('carga un día nuevo con un ejercicio del catálogo y guarda la estructura', async () => {
    vi.mocked(getRoutine).mockResolvedValue(volume)
    vi.mocked(searchExercises).mockResolvedValue(
      exercisesPage([
        createdExercise({ id: 'x-remo', name: 'Remo', muscleGroup: 'BACK' }),
      ]),
    )
    vi.mocked(saveRoutineStructure).mockResolvedValue(volume)
    renderPage()

    expect(
      screen.getByRole('status', { name: 'Cargando rutina' }),
    ).toBeInTheDocument()
    expect(
      await screen.findByRole('heading', { name: 'Fase de volumen', level: 1 }),
    ).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Agregar día' }))
    await userEvent.keyboard('Tirón')
    await userEvent.click(
      screen.getByRole('button', { name: 'Agregar ejercicio al día 2' }),
    )
    await userEvent.click(
      await screen.findByRole('button', { name: 'Agregar Remo' }),
    )
    await userEvent.click(
      screen.getByRole('button', { name: 'Cerrar buscador' }),
    )

    const row = screen.getByRole('listitem', { name: 'Remo' })
    expect(within(row).getByText('Espalda')).toBeInTheDocument()
    await userEvent.type(within(row).getByLabelText(/Series/), '4')
    await userEvent.type(within(row).getByLabelText(/Repeticiones/), '8')
    await userEvent.type(within(row).getByLabelText('Peso'), '60')
    await save()

    expect(
      await screen.findByText(
        `detalle de rutina ${volume.id} {"notice":"Guardaste la estructura de Fase de volumen."}`,
      ),
    ).toBeInTheDocument()
    expect(saveRoutineStructure).toHaveBeenCalledWith(volume.id, {
      days: [
        {
          id: volume.days[0].id,
          name: 'Empuje',
          exercises: [
            {
              id: volume.days[0].exercises[0].id,
              exerciseId: volume.days[0].exercises[0].exerciseId,
              sets: 4,
              reps: 10,
              recommendedWeight: null,
              rest: 90,
              rirRpe: null,
              techniqueNote: null,
            },
          ],
        },
        {
          name: 'Tirón',
          exercises: [
            {
              exerciseId: 'x-remo',
              sets: 4,
              reps: 8,
              recommendedWeight: 60,
              rest: null,
              rirRpe: null,
              techniqueNote: null,
            },
          ],
        },
      ],
    })
  })

  it('ante un 422 ofrece duplicar y lleva a la copia', async () => {
    const message =
      'No se puede quitar el ejercicio Press de banca porque tiene series registradas. Duplicá la rutina y editá la copia.'
    const copy = routineDetail({
      id: '11111111-2222-4333-8444-555555555555',
      name: 'Copia de Fase de volumen',
    })
    vi.mocked(getRoutine).mockResolvedValue(volume)
    vi.mocked(saveRoutineStructure).mockRejectedValue(
      new ApiError(message, 422),
    )
    vi.mocked(duplicateRoutine).mockResolvedValue(copy)
    renderPage()

    await userEvent.click(
      await screen.findByRole('button', { name: 'Quitar Press de banca' }),
    )
    await save()

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent(message)
    await userEvent.click(
      within(alert).getByRole('button', { name: /Duplicar rutina/ }),
    )

    expect(
      await screen.findByText(
        `detalle de rutina ${copy.id} {"notice":"Creaste Copia de Fase de volumen. Configurá su estructura con los cambios que necesitás."}`,
      ),
    ).toBeInTheDocument()
    expect(vi.mocked(duplicateRoutine).mock.calls[0][0]).toBe(volume.id)
  })

  it('un ejercicio que ya no está en el catálogo (404) va al aviso general', async () => {
    vi.mocked(getRoutine).mockResolvedValue(volume)
    vi.mocked(saveRoutineStructure).mockRejectedValue(
      new ApiError('No existe el ejercicio con id x', 404),
    )
    renderPage()

    await screen.findByRole('heading', { name: 'Fase de volumen' })
    await save()

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('No existe el ejercicio con id x')
    expect(
      within(alert).queryByRole('button', { name: /Duplicar/ }),
    ).not.toBeInTheDocument()
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
    expect(saveRoutineStructure).not.toHaveBeenCalled()
  })

  it.each([
    [403, 'No tenés acceso a esta rutina'],
    [404, 'La rutina no existe'],
  ])('ante un %i al cargar muestra el aviso', async (status, title) => {
    vi.mocked(getRoutine).mockRejectedValue(new ApiError('error', status))
    renderPage()

    expect(
      await screen.findByRole('heading', { name: title }),
    ).toBeInTheDocument()
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
    expect(
      await screen.findByRole('region', { name: 'Día 1' }),
    ).toBeInTheDocument()
  })
})
