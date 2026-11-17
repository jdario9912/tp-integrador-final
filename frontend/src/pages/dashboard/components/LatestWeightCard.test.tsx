import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { saveSession } from '../../../lib/auth'
import { getWeights } from '../../../lib/weights/get-weights'
import { session } from '../../../test/auth-fixtures'
import { weightRecord, weightsPage } from '../../../test/weight-fixtures'
import { ATHLETE_ID, renderWithRouter } from '../dashboard-test-utils'
import { LatestWeightCard } from './LatestWeightCard'

vi.mock('../../../lib/weights/get-weights', () => ({ getWeights: vi.fn() }))

const renderCard = () =>
  renderWithRouter(<LatestWeightCard athleteId={ATHLETE_ID} />)

const card = () => screen.getByRole('region', { name: 'Último peso' })

beforeEach(() => {
  saveSession(session('ATHLETE'))
  vi.mocked(getWeights).mockReset()
})

describe('LatestWeightCard', () => {
  it('pide solo el registro más reciente y muestra el peso con su fecha', async () => {
    vi.mocked(getWeights).mockResolvedValue(weightsPage())

    renderCard()

    expect(await within(card()).findByText('72,5 kg')).toBeInTheDocument()
    expect(
      within(card()).getByText('Registrado el 6 de noviembre de 2026'),
    ).toBeInTheDocument()
    expect(within(card()).getByText('En ayunas')).toBeInTheDocument()
    expect(getWeights).toHaveBeenCalledWith(ATHLETE_ID, { size: 1 })
  })

  it('sin registros invita a registrar el peso', async () => {
    vi.mocked(getWeights).mockResolvedValue(weightsPage([]))

    renderCard()

    expect(
      await within(card()).findByText('Todavía no registraste tu peso'),
    ).toBeInTheDocument()
    expect(
      within(card()).getByRole('link', { name: 'Registrar peso' }),
    ).toHaveAttribute('href', '/progress')
  })

  it('si falla muestra el error y Reintentar lo vuelve a pedir', async () => {
    vi.mocked(getWeights)
      .mockRejectedValueOnce(new Error('sin conexión'))
      .mockResolvedValue(weightsPage([weightRecord({ weightKg: 70 })]))
    const user = userEvent.setup()

    renderCard()

    expect(await within(card()).findByRole('alert')).toBeInTheDocument()
    await user.click(within(card()).getByRole('button', { name: 'Reintentar' }))

    expect(await within(card()).findByText('70 kg')).toBeInTheDocument()
  })
})
