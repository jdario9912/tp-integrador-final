import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { saveSession } from '../../../lib/auth'
import { getMealsOfDay } from '../../../lib/meals/get-meals'
import { getDailyNutritionSummary } from '../../meals/actions/get-daily-summary'
import {
  dailySummary,
  emptyDailySummary,
} from '../../../test/daily-summary-fixtures'
import { meal } from '../../../test/meal-fixtures'
import { session } from '../../../test/auth-fixtures'
import { ATHLETE_ID, renderWithRouter } from '../dashboard-test-utils'
import { TodayMealsCard } from './TodayMealsCard'

vi.mock('../../../lib/meals/get-meals', () => ({ getMealsOfDay: vi.fn() }))
vi.mock('../../meals/actions/get-daily-summary', () => ({
  getDailyNutritionSummary: vi.fn(),
}))

const renderCard = () =>
  renderWithRouter(<TodayMealsCard athleteId={ATHLETE_ID} />)

const card = () => screen.getByRole('region', { name: 'Comidas de hoy' })

beforeEach(() => {
  saveSession(session('ATHLETE'))
  vi.mocked(getDailyNutritionSummary).mockReset()
  vi.mocked(getMealsOfDay).mockReset()
  vi.mocked(getDailyNutritionSummary).mockResolvedValue(dailySummary())
  vi.mocked(getMealsOfDay).mockResolvedValue([meal()])
})

describe('TodayMealsCard', () => {
  it('muestra las calorías, los macros y los tipos de comida del día', async () => {
    renderCard()

    expect(await within(card()).findByText('507,5 kcal')).toBeInTheDocument()
    expect(
      within(card()).getByText('2 comidas registradas'),
    ).toBeInTheDocument()
    expect(within(card()).getByText('46,5 g')).toBeInTheDocument()
    expect(
      within(card()).getByRole('list', { name: 'Tipos de comida de hoy' }),
    ).toHaveTextContent('Almuerzo')
  })

  it('sin comidas invita a registrar una', async () => {
    vi.mocked(getDailyNutritionSummary).mockResolvedValue(emptyDailySummary())
    vi.mocked(getMealsOfDay).mockResolvedValue([])

    renderCard()

    expect(
      await within(card()).findByText('Todavía no registraste comidas'),
    ).toBeInTheDocument()
    expect(
      within(card()).getByRole('link', { name: 'Registrar comida' }),
    ).toHaveAttribute('href', '/meals')
  })

  it('avisa que las comidas sin datos no entran en el total', async () => {
    vi.mocked(getDailyNutritionSummary).mockResolvedValue(
      dailySummary({ mealsWithoutNutrition: 1 }),
    )

    renderCard()

    expect(
      await within(card()).findByText(
        '1 comida sin datos nutricionales no se cuenta en el total.',
      ),
    ).toBeInTheDocument()
  })

  it('si falla el resumen muestra el error y Reintentar lo vuelve a pedir', async () => {
    vi.mocked(getDailyNutritionSummary)
      .mockRejectedValueOnce(new Error('sin conexión'))
      .mockResolvedValue(dailySummary())
    const user = userEvent.setup()

    renderCard()

    expect(await within(card()).findByRole('alert')).toHaveTextContent(
      'Ocurrió un error inesperado',
    )
    await user.click(within(card()).getByRole('button', { name: 'Reintentar' }))

    expect(await within(card()).findByText('507,5 kcal')).toBeInTheDocument()
  })

  it('si falla el listado, los totales se muestran igual sin los tipos', async () => {
    vi.mocked(getMealsOfDay).mockRejectedValue(new Error('sin conexión'))

    renderCard()

    expect(await within(card()).findByText('507,5 kcal')).toBeInTheDocument()
    expect(
      within(card()).queryByRole('list', { name: 'Tipos de comida de hoy' }),
    ).not.toBeInTheDocument()
    expect(within(card()).queryByRole('alert')).not.toBeInTheDocument()
  })
})
