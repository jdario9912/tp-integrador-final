import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { saveSession } from '../../../lib/auth'
import { getTrainingHistory } from '../../../lib/training-sessions/get-training-history'
import { session } from '../../../test/auth-fixtures'
import { trainingHistoryItem } from '../../../test/training-session-fixtures'
import { ATHLETE_ID, pageOf, renderWithRouter } from '../dashboard-test-utils'
import { HISTORY_PAGE_SIZE } from '../dashboard-format'
import { TrainerNotesCard } from './TrainerNotesCard'

vi.mock('../../../lib/training-sessions/get-training-history', () => ({
  getTrainingHistory: vi.fn(),
}))

const renderCard = () =>
  renderWithRouter(<TrainerNotesCard athleteId={ATHLETE_ID} />)

const card = () =>
  screen.getByRole('region', { name: 'Observaciones del entrenador' })

// sesión revisada con observación; el id la distingue de las demás
const observed = (id: string, observation: string) =>
  trainingHistoryItem({
    id,
    review: { reviewedAt: '2026-11-12T10:00:00Z', observation },
  })

beforeEach(() => {
  saveSession(session('ATHLETE'))
  vi.mocked(getTrainingHistory).mockReset()
})

describe('TrainerNotesCard', () => {
  it('muestra hasta 3 observaciones, sin las sesiones sin revisar ni sin texto', async () => {
    vi.mocked(getTrainingHistory).mockResolvedValue(
      pageOf([
        trainingHistoryItem({ id: 'sin-revisar', review: null }),
        observed('uno', 'Buen trabajo en el press'),
        trainingHistoryItem({
          id: 'revisada-sin-texto',
          review: { reviewedAt: '2026-11-12T10:00:00Z', observation: null },
        }),
        observed('dos', 'Subí el peso la semana que viene'),
        observed('tres', 'Cuidá la técnica en el remo'),
        observed('cuatro', 'Esta ya no entra'),
      ]),
    )

    renderCard()

    const list = await within(card()).findByRole('list', {
      name: 'Observaciones del entrenador',
    })
    const items = within(list).getAllByRole('listitem')
    expect(items).toHaveLength(3)
    expect(items[0]).toHaveTextContent('Buen trabajo en el press')
    expect(
      within(card()).queryByText('Esta ya no entra'),
    ).not.toBeInTheDocument()
    expect(getTrainingHistory).toHaveBeenCalledWith(ATHLETE_ID, {
      size: HISTORY_PAGE_SIZE,
    })
  })

  it('sin observaciones explica que todavía no hay y ofrece el historial', async () => {
    vi.mocked(getTrainingHistory).mockResolvedValue(
      pageOf([trainingHistoryItem({ review: null })]),
    )

    renderCard()

    expect(
      await within(card()).findByText(
        'Tu entrenador todavía no dejó observaciones',
      ),
    ).toBeInTheDocument()
    expect(
      within(card()).getByRole('link', { name: 'Ver entrenamientos' }),
    ).toHaveAttribute('href', '/training-history')
  })

  it('si falla muestra el error y Reintentar lo vuelve a pedir', async () => {
    vi.mocked(getTrainingHistory)
      .mockRejectedValueOnce(new Error('sin conexión'))
      .mockResolvedValue(pageOf([observed('uno', 'Buen trabajo')]))
    const user = userEvent.setup()

    renderCard()

    expect(await within(card()).findByRole('alert')).toBeInTheDocument()
    await user.click(within(card()).getByRole('button', { name: 'Reintentar' }))

    expect(await within(card()).findByText('Buen trabajo')).toBeInTheDocument()
  })
})
