import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../../lib/api'
import { saveSession } from '../../lib/auth'
import { getMuscleGroups } from '../../lib/exercises/get-muscle-groups'
import { todayInAppTimeZone } from '../../lib/iso-date'
import {
  createMemoryRouter,
  RouterProvider,
  type RouterProviderProps,
} from '../../lib/navigation'
import { getTrainingSession } from '../../lib/training-sessions/get-training-session'
import { paths, trainingPath } from '../../router/paths'
import { legsDay } from '../../test/athlete-routine-fixtures'
import { session } from '../../test/auth-fixtures'
import { muscleGroups } from '../../test/exercise-fixtures'
import {
  SESSION_ID,
  trainingSession,
} from '../../test/training-session-fixtures'
import { TrainingSessionPage } from './TrainingSessionPage'

vi.mock('../../lib/training-sessions/get-training-session', () => ({
  getTrainingSession: vi.fn(),
}))
vi.mock('../../lib/exercises/get-muscle-groups', () => ({
  getMuscleGroups: vi.fn(),
}))

const ATHLETE_ID = session('ATHLETE').user.id

let router: RouterProviderProps['router']

const renderPage = (sessionId = SESSION_ID) => {
  router = createMemoryRouter(
    [
      { path: paths.training, element: <TrainingSessionPage /> },
      { path: paths.myRoutine, element: <h1>Mi rutina</h1> },
    ],
    { initialEntries: [trainingPath(sessionId)] },
  )
  render(
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { queries: { retry: false } } })
      }
    >
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
}

const exercises = () => screen.findByRole('list', { name: 'Ejercicios' })
// valor de un dato del ejercicio por su etiqueta (<dt>/<dd>)
const metric = (item: HTMLElement, label: string) =>
  within(item).getByText(label).nextElementSibling?.textContent

beforeEach(() => {
  vi.mocked(getTrainingSession).mockReset()
  vi.mocked(getMuscleGroups).mockReset()
  vi.mocked(getMuscleGroups).mockResolvedValue(muscleGroups)
  saveSession(session('ATHLETE'))
})

describe('TrainingSessionPage · entrenamiento en curso', () => {
  it('muestra un skeleton mientras carga y después el día con su hora de inicio', async () => {
    vi.mocked(getTrainingSession).mockResolvedValue(
      trainingSession({ sessionDate: todayInAppTimeZone() }),
    )

    renderPage()

    expect(
      screen.getByRole('status', { name: 'Cargando el entrenamiento' }),
    ).toBeInTheDocument()
    expect(
      await screen.findByRole('heading', {
        name: 'Entrenamiento en curso',
        level: 1,
      }),
    ).toBeInTheDocument()
    expect(getTrainingSession).toHaveBeenCalledWith(ATHLETE_ID, SESSION_ID)
    expect(screen.getByText('Fuerza 2 días')).toBeInTheDocument()
    expect(screen.getByText('Empezaste hoy a las 19:15')).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: 'Día 1: Torso', level: 2 }),
    ).toBeInTheDocument()
    expect(screen.getByText('2 ejercicios')).toBeInTheDocument()
    expect(
      screen.queryByRole('status', { name: 'Cargando el entrenamiento' }),
    ).not.toBeInTheDocument()
  })

  it('muestra los ejercicios planificados del día, en orden y de solo lectura', async () => {
    vi.mocked(getTrainingSession).mockResolvedValue(trainingSession())

    renderPage()

    const items = within(await exercises()).getAllByRole('listitem')
    expect(
      items.map(
        (item) => within(item).getByRole('heading', { level: 3 }).textContent,
      ),
    ).toEqual(['Press de banca', 'Remo con barra'])
    const bench = items[0]
    expect(within(bench).getByText('Pecho')).toBeInTheDocument()
    expect(metric(bench, 'Series × reps')).toBe('4 × 8')
    expect(metric(bench, 'Peso')).toBe('62,5 kg')
    expect(metric(bench, 'Descanso')).toBe('2 min')
    expect(metric(bench, 'Esfuerzo')).toBe('RIR 2')
    expect(bench).toHaveTextContent(
      'Nota técnica: Bajar controlado hasta tocar el pecho',
    )
    // US-19 y US-20 suman la carga de series y finalizar o cancelar: hoy no hay acciones
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
    expect(screen.queryByText('Hoy te toca')).not.toBeInTheDocument()
  })

  it('si quedó abierto de otro día muestra también la fecha de inicio', async () => {
    vi.mocked(getTrainingSession).mockResolvedValue(
      trainingSession({
        sessionDate: '2026-11-01',
        startedAt: '2026-11-01T21:05:00Z',
        day: legsDay(),
      }),
    )

    renderPage()

    expect(
      await screen.findByText(
        'Empezaste el 1 de noviembre de 2026 a las 18:05',
      ),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: 'Día 2: Pierna', level: 2 }),
    ).toBeInTheDocument()
  })

  it('un día que el entrenador dejó sin ejercicios muestra su estado vacío', async () => {
    vi.mocked(getTrainingSession).mockResolvedValue(
      trainingSession({ day: { ...legsDay(), exercises: [] } }),
    )

    renderPage()

    expect(
      await screen.findByText('Este día no tiene ejercicios'),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('list', { name: 'Ejercicios' }),
    ).not.toBeInTheDocument()
  })

  it('una sesión que ya no está en curso se muestra con su estado (desde US-20)', async () => {
    vi.mocked(getTrainingSession).mockResolvedValue(
      trainingSession({ status: 'FINISHED' }),
    )

    renderPage()

    expect(
      await screen.findByRole('heading', {
        name: 'Entrenamiento finalizado',
        level: 1,
      }),
    ).toBeInTheDocument()
    expect(await exercises()).toBeInTheDocument()
  })

  it('el enlace vuelve a Mi rutina', async () => {
    vi.mocked(getTrainingSession).mockResolvedValue(trainingSession())
    renderPage()
    await exercises()

    await userEvent.click(
      screen.getByRole('link', { name: 'Volver a Mi rutina' }),
    )

    expect(
      await screen.findByRole('heading', { name: 'Mi rutina', level: 1 }),
    ).toBeInTheDocument()
    expect(router.state.location.pathname).toBe(paths.myRoutine)
  })
})

describe('TrainingSessionPage · estados', () => {
  it.each([404, 400])(
    'un %i muestra que no se encontró el entrenamiento, sin Reintentar',
    async (status) => {
      vi.mocked(getTrainingSession).mockRejectedValue(
        new ApiError(
          `No existe la sesión de entrenamiento con id ${SESSION_ID}`,
          status,
        ),
      )

      renderPage()

      expect(
        await screen.findByText('No encontramos este entrenamiento'),
      ).toBeInTheDocument()
      expect(screen.queryByText(SESSION_ID, { exact: false })).toBeNull()
      expect(
        screen.queryByRole('button', { name: 'Reintentar' }),
      ).not.toBeInTheDocument()
      expect(
        screen.getByRole('heading', { name: 'Entrenamiento', level: 1 }),
      ).toBeInTheDocument()
      expect(
        screen.getByRole('link', { name: 'Volver a Mi rutina' }),
      ).toBeInTheDocument()
    },
  )

  it('un 403 muestra el aviso de permisos sin Reintentar', async () => {
    vi.mocked(getTrainingSession).mockRejectedValue(
      new ApiError('No tiene permisos para acceder a este atleta', 403),
    )

    renderPage()

    expect(
      await screen.findByText('No podés ver este entrenamiento'),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Reintentar' }),
    ).not.toBeInTheDocument()
  })

  it('un error de red muestra el mensaje y Reintentar vuelve a pedir la sesión', async () => {
    vi.mocked(getTrainingSession)
      .mockRejectedValueOnce(
        new ApiError('No se pudo conectar con el servidor', 0),
      )
      .mockResolvedValueOnce(trainingSession())

    renderPage()

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No se pudo conectar con el servidor',
    )
    await userEvent.click(screen.getByRole('button', { name: 'Reintentar' }))

    expect(await exercises()).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(getTrainingSession).toHaveBeenCalledTimes(2)
  })

  it('un error inesperado muestra un mensaje genérico', async () => {
    vi.mocked(getTrainingSession).mockRejectedValue(new Error('boom'))

    renderPage()

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Ocurrió un error inesperado. Intentá nuevamente.',
    )
    expect(
      screen.getByRole('button', { name: 'Reintentar' }),
    ).toBeInTheDocument()
  })

  it('si el catálogo de grupos musculares falla, muestra los ejercicios sin el grupo', async () => {
    vi.mocked(getMuscleGroups).mockRejectedValue(
      new ApiError('No se pudo conectar con el servidor', 0),
    )
    vi.mocked(getTrainingSession).mockResolvedValue(trainingSession())

    renderPage()

    const bench = within(await exercises()).getAllByRole('listitem')[0]
    expect(metric(bench, 'Series × reps')).toBe('4 × 8')
    expect(within(bench).queryByText('Pecho')).not.toBeInTheDocument()
  })
})
