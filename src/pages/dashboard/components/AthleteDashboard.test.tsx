import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getAthleteRoutine } from '../../../lib/athlete-routine/get-athlete-routine'
import { saveSession } from '../../../lib/auth'
import { getMealsOfDay } from '../../../lib/meals/get-meals'
import { getNotes } from '../../../lib/notes/get-notes'
import { getTrainingHistory } from '../../../lib/training-sessions/get-training-history'
import { getInProgressSession } from '../../../lib/training-sessions/get-in-progress-session'
import { getWeights } from '../../../lib/weights/get-weights'
import { MemoryRouter } from '../../../lib/navigation'
import { athleteRoutine } from '../../../test/athlete-routine-fixtures'
import { session } from '../../../test/auth-fixtures'
import { dailySummary } from '../../../test/daily-summary-fixtures'
import { trainingHistoryItem } from '../../../test/training-session-fixtures'
import { weightsPage } from '../../../test/weight-fixtures'
import { pageOf } from '../dashboard-test-utils'
import { getDailyNutritionSummary } from '../../meals/actions/get-daily-summary'
import { AthleteDashboard } from './AthleteDashboard'

vi.mock('../../../lib/athlete-routine/get-athlete-routine', () => ({
  getAthleteRoutine: vi.fn(),
}))
vi.mock('../../../lib/training-sessions/get-in-progress-session', () => ({
  getInProgressSession: vi.fn(),
}))
vi.mock('../../../lib/training-sessions/get-training-history', () => ({
  getTrainingHistory: vi.fn(),
}))
vi.mock('../../../lib/weights/get-weights', () => ({ getWeights: vi.fn() }))
vi.mock('../../../lib/meals/get-meals', () => ({ getMealsOfDay: vi.fn() }))
// US-46: la tarjeta se prueba en AthleteNotesCard.test
vi.mock('../../../lib/notes/get-notes', () => ({ getNotes: vi.fn() }))
vi.mock('../../meals/actions/get-daily-summary', () => ({
  getDailyNutritionSummary: vi.fn(),
}))

const renderDashboard = () =>
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
      <MemoryRouter>
        <AthleteDashboard />
      </MemoryRouter>
    </QueryClientProvider>,
  )

beforeEach(() => {
  saveSession(session('ATHLETE'))
  vi.mocked(getAthleteRoutine).mockResolvedValue(athleteRoutine())
  vi.mocked(getInProgressSession).mockResolvedValue(null)
  vi.mocked(getWeights).mockResolvedValue(weightsPage())
  vi.mocked(getDailyNutritionSummary).mockResolvedValue(dailySummary())
  vi.mocked(getMealsOfDay).mockResolvedValue([])
  vi.mocked(getNotes).mockResolvedValue([])
  vi.mocked(getTrainingHistory).mockResolvedValue(
    pageOf([trainingHistoryItem()]),
  )
})

describe('AthleteDashboard', () => {
  it('muestra las tarjetas del día y las notas del entrenador', async () => {
    renderDashboard()

    for (const name of [
      'Entrenamiento de hoy',
      'Comidas de hoy',
      'Último peso',
      'Observaciones del entrenador',
      'Notas de tu entrenador',
    ]) {
      expect(screen.getByRole('region', { name })).toBeInTheDocument()
    }
    expect(
      await within(
        screen.getByRole('region', { name: 'Entrenamiento de hoy' }),
      ).findByRole('heading', { name: 'Día 1: Torso', level: 3 }),
    ).toBeInTheDocument()
    expect(await screen.findByText('507,5 kcal')).toBeInTheDocument()
  })

  it('si una tarjeta falla, las otras siguen mostrando sus datos', async () => {
    vi.mocked(getWeights).mockRejectedValue(new Error('sin conexión'))

    renderDashboard()

    const weight = screen.getByRole('region', { name: 'Último peso' })
    expect(await within(weight).findByRole('alert')).toBeInTheDocument()
    expect(
      await within(
        screen.getByRole('region', { name: 'Entrenamiento de hoy' }),
      ).findByRole('heading', { name: 'Día 1: Torso', level: 3 }),
    ).toBeInTheDocument()
    expect(await screen.findByText('507,5 kcal')).toBeInTheDocument()
    expect(
      screen.getByRole('region', { name: 'Observaciones del entrenador' }),
    ).toBeInTheDocument()
  })
})
