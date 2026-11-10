import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../../lib/api'
import { saveSession } from '../../lib/auth'
import {
  createMemoryRouter,
  RouterProvider,
  type RouterProviderProps,
} from '../../lib/navigation'
import { getMuscleGroups } from '../../lib/exercises/get-muscle-groups'
import { duplicateRoutine } from '../../lib/routines/duplicate-routine'
import { getRoutine } from '../../lib/routines/get-routine'
import {
  paths,
  routineDetailPath,
  routineEditPath,
  routineStructurePath,
} from '../../router/paths'
import { session } from '../../test/auth-fixtures'
import { muscleGroups } from '../../test/exercise-fixtures'
import {
  routineDay,
  routineDetail,
  routineExercise,
} from '../../test/routine-fixtures'
import { RoutineDetailPage } from './RoutineDetailPage'

vi.mock('../../lib/routines/get-routine', () => ({ getRoutine: vi.fn() }))
vi.mock('../../lib/routines/duplicate-routine', () => ({
  duplicateRoutine: vi.fn(),
}))
vi.mock('../../lib/exercises/get-muscle-groups', () => ({
  getMuscleGroups: vi.fn(),
}))

const volume = routineDetail({
  goal: 'Hipertrofia',
  daysPerWeek: 4,
  durationWeeks: 8,
  description: 'Bloque de acumulación',
  isTemplate: true,
})

let router: RouterProviderProps['router']

const renderPage = (state?: unknown) => {
  router = createMemoryRouter(
    [
      { path: paths.routineDetail, element: <RoutineDetailPage /> },
      { path: paths.routines, element: <p>listado de rutinas</p> },
      { path: paths.editRoutine, element: <p>edición de la rutina</p> },
      {
        path: paths.routineStructure,
        element: <p>estructura de la rutina</p>,
      },
    ],
    { initialEntries: [{ pathname: routineDetailPath(volume.id), state }] },
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
  vi.mocked(getRoutine).mockReset()
  vi.mocked(duplicateRoutine).mockReset()
  vi.mocked(getMuscleGroups).mockResolvedValue(muscleGroups)
  saveSession(session('COACH'))
})

describe('RoutineDetailPage', () => {
  it('pide la rutina de la URL y muestra sus datos', async () => {
    vi.mocked(getRoutine).mockResolvedValue(volume)

    renderPage()

    expect(
      screen.getByRole('status', { name: 'Cargando rutina' }),
    ).toBeInTheDocument()
    expect(
      await screen.findByRole('heading', {
        name: 'Fase de volumen',
        level: 1,
      }),
    ).toBeInTheDocument()
    expect(getRoutine).toHaveBeenCalledWith(volume.id)
    expect(screen.getByText(/Creada el 5 de noviembre de 2026/)).toBeVisible()
    expect(screen.getByText('Hipertrofia')).toBeInTheDocument()
    expect(screen.getByText('4 días por semana')).toBeInTheDocument()
    expect(screen.getByText('8 semanas')).toBeInTheDocument()
    expect(screen.getByText('Bloque de acumulación')).toBeInTheDocument()
    expect(screen.getByText('Sí')).toBeInTheDocument()
    // solo lectura
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
  })

  it('sin los opcionales muestra textos de reemplazo', async () => {
    vi.mocked(getRoutine).mockResolvedValue(routineDetail())

    renderPage()

    expect(await screen.findByText('Sin objetivo')).toBeInTheDocument()
    expect(screen.getAllByText('Sin definir')).toHaveLength(2)
    expect(screen.getByText('Sin descripción')).toBeInTheDocument()
    expect(screen.getByText('No')).toBeInTheDocument()
    expect(screen.queryByText('Plantilla', { selector: 'span' })).toBeNull()
  })

  it('muestra los días y ejercicios en orden con lo que se cargó', async () => {
    vi.mocked(getRoutine).mockResolvedValue({
      ...volume,
      days: [
        routineDay({
          name: 'Empuje',
          exercises: [
            routineExercise({
              recommendedWeight: 82.5,
              rest: 90,
              rirRpe: 'RIR 2',
              techniqueNote: 'Escápulas retraídas',
            }),
            routineExercise({
              id: 'e2',
              exerciseName: 'Fondos',
              muscleGroup: 'TRICEPS',
              sortOrder: 1,
              sets: 3,
              reps: 12,
            }),
          ],
        }),
        routineDay({ id: 'd2', dayNumber: 2, name: 'Descanso activo' }),
      ],
    })

    renderPage()

    const push = await screen.findByRole('listitem', { name: 'Día 1: Empuje' })
    const exercises = within(push).getAllByRole('listitem')
    expect(exercises).toHaveLength(2)
    expect(exercises[0]).toHaveTextContent('Press de banca')
    expect(exercises[0]).toHaveTextContent('Pecho')
    expect(exercises[0]).toHaveTextContent(
      '4 × 10 · 82,5 kg · Descanso 1 min 30 s · RIR 2',
    )
    expect(exercises[0]).toHaveTextContent('Escápulas retraídas')
    expect(exercises[1]).toHaveTextContent('Fondos')
    expect(exercises[1]).toHaveTextContent('3 × 12')
    expect(within(push).getByText('2 ejercicios')).toBeInTheDocument()
    expect(
      within(
        screen.getByRole('listitem', { name: 'Día 2: Descanso activo' }),
      ).getByText('Sin ejercicios cargados.'),
    ).toBeInTheDocument()
  })

  it('sin días invita a configurar la estructura', async () => {
    vi.mocked(getRoutine).mockResolvedValue(volume)

    renderPage()

    expect(
      await screen.findByText('Todavía no cargaste los días'),
    ).toBeInTheDocument()
    await userEvent.click(
      screen.getByRole('link', { name: 'Configurar estructura' }),
    )
    expect(screen.getByText('estructura de la rutina')).toBeInTheDocument()
  })

  it.each([
    ['Editar', 'edición de la rutina', routineEditPath(volume.id)],
    [
      'Configurar estructura',
      'estructura de la rutina',
      routineStructurePath(volume.id),
    ],
  ])('el botón %s lleva a su página', async (button, text, pathname) => {
    vi.mocked(getRoutine).mockResolvedValue(volume)

    renderPage()

    await userEvent.click(
      await screen.findByRole('button', { name: new RegExp(button) }),
    )
    expect(screen.getByText(text)).toBeInTheDocument()
    expect(router.state.location.pathname).toBe(pathname)
  })

  it('duplica la rutina y muestra la copia con el aviso', async () => {
    const copy = routineDetail({
      id: '11111111-2222-4333-8444-555555555555',
      name: 'Copia de Fase de volumen',
    })
    vi.mocked(getRoutine).mockImplementation(async (id) =>
      id === copy.id ? copy : volume,
    )
    vi.mocked(duplicateRoutine).mockResolvedValue(copy)

    renderPage()

    await userEvent.click(
      await screen.findByRole('button', { name: /Duplicar/ }),
    )

    expect(
      await screen.findByRole('heading', {
        name: 'Copia de Fase de volumen',
        level: 1,
      }),
    ).toBeInTheDocument()
    expect(
      screen.getByText('Creaste Copia de Fase de volumen.'),
    ).toBeInTheDocument()
    expect(vi.mocked(duplicateRoutine).mock.calls[0][0]).toBe(volume.id)
    expect(router.state.location.pathname).toBe(routineDetailPath(copy.id))
  })

  it('muestra el error al duplicar y se queda en la rutina', async () => {
    vi.mocked(getRoutine).mockResolvedValue(volume)
    vi.mocked(duplicateRoutine).mockRejectedValue(
      new ApiError('No tiene permisos para acceder a esta rutina', 403),
    )

    renderPage()

    await userEvent.click(
      await screen.findByRole('button', { name: /Duplicar/ }),
    )

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No tiene permisos para acceder a esta rutina',
    )
    expect(router.state.location.pathname).toBe(routineDetailPath(volume.id))
  })

  it('muestra el aviso del alta una sola vez', async () => {
    vi.mocked(getRoutine).mockResolvedValue(volume)

    renderPage({ notice: 'Creaste la rutina Fase de volumen.' })

    expect(
      await screen.findByText('Creaste la rutina Fase de volumen.'),
    ).toBeInTheDocument()
    await waitFor(() => expect(router.state.location.state).toBeNull())
    expect(router.state.location.pathname).toBe(routineDetailPath(volume.id))
  })

  it.each([
    [404, 'No existe la rutina con id x', 'La rutina no existe'],
    [400, 'La solicitud tiene campos inválidos', 'La rutina no existe'],
    [
      403,
      'No tiene permisos para acceder a esta rutina',
      'No tenés acceso a esta rutina',
    ],
  ])(
    'ante un %i muestra el aviso sin reintentar',
    async (status, message, title) => {
      vi.mocked(getRoutine).mockRejectedValue(new ApiError(message, status))

      renderPage()

      expect(
        await screen.findByRole('heading', { name: title }),
      ).toBeInTheDocument()
      expect(
        screen.queryByRole('button', { name: /Reintentar/ }),
      ).not.toBeInTheDocument()
      await userEvent.click(
        screen.getByRole('link', { name: 'Volver a rutinas' }),
      )
      expect(screen.getByText('listado de rutinas')).toBeInTheDocument()
    },
  )

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
      await screen.findByRole('heading', { name: 'Fase de volumen' }),
    ).toBeInTheDocument()
  })
})
