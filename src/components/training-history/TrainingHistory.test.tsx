import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError, type PageResponse } from '../../lib/api'
import { getTrainingHistory } from '../../lib/training-sessions/get-training-history'
import { getTrainingSession } from '../../lib/training-sessions/get-training-session'
import type { TrainingHistoryItem } from '../../lib/training-sessions'
import { saveSession } from '../../lib/auth'
import { session } from '../../test/auth-fixtures'
import {
  SESSION_ID,
  trainingHistoryItem,
  trainingSession,
} from '../../test/training-session-fixtures'
import { torsoDay } from '../../test/athlete-routine-fixtures'
import { TrainingHistory } from './TrainingHistory'

vi.mock('../../lib/training-sessions/get-training-history', () => ({
  getTrainingHistory: vi.fn(),
}))
vi.mock('../../lib/training-sessions/get-training-session', () => ({
  getTrainingSession: vi.fn(),
}))

const ATHLETE_ID = '0a6d2b9e-7c51-4c1e-9d3f-2b8e5f6a7c10'
const BENCH_ID = 'e1f2a3b4-c5d6-4e7f-8a9b-0c1d2e3f4a5b'

const pageOf = (
  content: TrainingHistoryItem[],
): PageResponse<TrainingHistoryItem> => ({
  content,
  page: 0,
  size: 10,
  totalElements: content.length,
  totalPages: content.length > 0 ? 1 : 0,
})

const renderHistory = () => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={client}>
      <TrainingHistory
        athleteId={ATHLETE_ID}
        emptyDescription="Cuando finalices o canceles un entrenamiento, lo vas a ver acá."
        renderReview={(current) => <p>Revisión de {current.id}</p>}
      />
    </QueryClientProvider>,
  )
}

const list = () =>
  screen.findByRole('list', { name: 'Entrenamientos cerrados' })

beforeEach(() => {
  vi.mocked(getTrainingHistory).mockReset()
  vi.mocked(getTrainingSession).mockReset()
  saveSession(session('ATHLETE'))
})

describe('TrainingHistory (US-21)', () => {
  it('lista las sesiones cerradas con fecha, día, estado y cumplimiento', async () => {
    vi.mocked(getTrainingHistory).mockResolvedValue(
      pageOf([
        trainingHistoryItem(),
        trainingHistoryItem({
          id: 'otra',
          status: 'CANCELLED',
          dayNumber: 2,
          dayName: 'Piernas',
          summary: {
            prescribedSets: 5,
            doneSets: 0,
            skippedSets: 0,
            pendingSets: 5,
            volumeKg: 0,
          },
        }),
      ]),
    )

    renderHistory()

    const items = within(await list()).getAllByRole('listitem')
    expect(items).toHaveLength(2)
    expect(within(items[0]).getByText('Finalizada')).toBeInTheDocument()
    expect(
      within(items[0]).getByText('Día 1 · Torso · Fuerza 2 días'),
    ).toBeInTheDocument()
    expect(within(items[0]).getByText('6 de 7 series')).toBeInTheDocument()
    expect(within(items[1]).getByText('Cancelada')).toBeInTheDocument()
    expect(within(items[1]).getByText('0 de 5 series')).toBeInTheDocument()
  })

  it('marca las sesiones revisadas', async () => {
    vi.mocked(getTrainingHistory).mockResolvedValue(
      pageOf([
        trainingHistoryItem({
          review: { reviewedAt: '2026-11-14T20:00:00Z', observation: null },
        }),
      ]),
    )

    renderHistory()

    expect(await screen.findByText('Revisada')).toBeInTheDocument()
  })

  it('al abrir una sesión muestra su detalle, sus series y la revisión, y mueve el foco', async () => {
    const user = userEvent.setup()
    vi.mocked(getTrainingHistory).mockResolvedValue(
      pageOf([trainingHistoryItem()]),
    )
    vi.mocked(getTrainingSession).mockResolvedValue(
      trainingSession({
        status: 'FINISHED',
        endedAt: '2026-11-11T23:02:47.104812Z',
        performedSets: [
          {
            id: 's1',
            routineExerciseId: BENCH_ID,
            setNumber: 1,
            status: 'DONE',
            weight: 62.5,
            reps: 8,
            rpe: 8,
            skipReason: null,
          },
          {
            id: 's2',
            routineExerciseId: BENCH_ID,
            setNumber: 2,
            status: 'SKIPPED',
            weight: null,
            reps: null,
            rpe: null,
            skipReason: 'Molestia en el hombro',
          },
        ],
      }),
    )

    renderHistory()
    await user.click(await screen.findByRole('button', { name: /Torso/ }))

    const heading = await screen.findByRole('heading', {
      name: 'Detalle del entrenamiento',
    })
    expect(heading).toHaveFocus()
    expect(getTrainingSession).toHaveBeenCalledWith(ATHLETE_ID, SESSION_ID)
    expect(
      await screen.findByText('62,5 kg × 8 repeticiones · RPE 8'),
    ).toBeInTheDocument()
    expect(
      screen.getByText('Omitida: Molestia en el hombro'),
    ).toBeInTheDocument()
    // las series 2 a 4 de press y las de remo no tienen registro
    expect(screen.getAllByText('Sin registrar').length).toBeGreaterThan(0)
    expect(
      screen.getByRole('heading', {
        name: torsoDay().exercises[0].exerciseName,
      }),
    ).toBeInTheDocument()
    expect(screen.getByText(`Revisión de ${SESSION_ID}`)).toBeInTheDocument()
  })

  it('un rango con desde posterior a hasta avisa y no pide la lista con ese rango', async () => {
    vi.mocked(getTrainingHistory).mockResolvedValue(
      pageOf([trainingHistoryItem()]),
    )
    renderHistory()
    await list()

    fireEvent.change(screen.getByLabelText('Hasta'), {
      target: { value: '2026-11-01' },
    })
    fireEvent.change(screen.getByLabelText('Desde'), {
      target: { value: '2026-11-05' },
    })

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'La fecha «Desde» no puede ser posterior a «Hasta»',
    )
    expect(screen.getByLabelText('Desde')).toHaveAttribute(
      'aria-invalid',
      'true',
    )
    expect(
      vi
        .mocked(getTrainingHistory)
        .mock.calls.some(([, query]) => query?.from === '2026-11-05'),
    ).toBe(false)
  })

  it('con un filtro sin resultados muestra el vacío del rango y se puede quitar', async () => {
    const user = userEvent.setup()
    vi.mocked(getTrainingHistory).mockImplementation(async (_id, query) =>
      query?.from ? pageOf([]) : pageOf([trainingHistoryItem()]),
    )
    renderHistory()
    await list()

    fireEvent.change(screen.getByLabelText('Desde'), {
      target: { value: '2020-01-01' },
    })

    expect(
      await screen.findByRole('heading', {
        name: 'Sin entrenamientos en ese rango',
      }),
    ).toBeInTheDocument()

    await user.click(
      screen.getByRole('button', { name: 'Quitar filtro de fechas' }),
    )

    expect(await list()).toBeInTheDocument()
    expect(screen.getByLabelText('Desde')).toHaveValue('')
  })

  it('sin sesiones cerradas muestra el vacío general', async () => {
    vi.mocked(getTrainingHistory).mockResolvedValue(pageOf([]))

    renderHistory()

    expect(
      await screen.findByRole('heading', {
        name: 'Todavía no hay entrenamientos cerrados',
      }),
    ).toBeInTheDocument()
    expect(
      screen.getByText(
        'Cuando finalices o canceles un entrenamiento, lo vas a ver acá.',
      ),
    ).toBeInTheDocument()
  })

  it('un error de la lista se puede reintentar', async () => {
    const user = userEvent.setup()
    vi.mocked(getTrainingHistory)
      .mockRejectedValueOnce(new ApiError('Error del servidor', 500))
      .mockResolvedValueOnce(pageOf([trainingHistoryItem()]))

    renderHistory()

    expect(
      await screen.findByText(
        'No se pudo cargar el historial de entrenamientos.',
        {
          exact: false,
        },
      ),
    ).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Reintentar' }))

    expect(await list()).toBeInTheDocument()
  })
})
