import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../../../lib/api'
import { saveSession } from '../../../lib/auth'
import { getMealsOfDay } from '../../../lib/meals/get-meals'
import { putMealReview } from '../../../lib/meals/put-meal-review'
import { session } from '../../../test/auth-fixtures'
import {
  dailySummary,
  emptyDailySummary,
} from '../../../test/daily-summary-fixtures'
import { meal } from '../../../test/meal-fixtures'
import { getDailyNutritionSummary } from '../../meals/actions/get-daily-summary'
import { getNutritionOverview } from '../actions/get-nutrition-overview'
import type { NutritionOverview } from '../types'
import { NutritionSection } from './NutritionSection'

vi.mock('../actions/get-nutrition-overview', () => ({
  getNutritionOverview: vi.fn(),
}))
vi.mock('../../meals/actions/get-daily-summary', () => ({
  getDailyNutritionSummary: vi.fn(),
}))
vi.mock('../../../lib/meals/get-meals', () => ({ getMealsOfDay: vi.fn() }))
vi.mock('../../../lib/meals/put-meal-review', () => ({
  putMealReview: vi.fn(),
}))

const ATHLETE_ID = '3f1c2a9e-8b7d-4c1e-9a2b-5d6e7f8a9b0c'
// "hoy" fijo en la zona de la app: martes 17 de noviembre de 2026
const TODAY = '2026-11-17'
const WEEK = [
  '2026-11-11',
  '2026-11-12',
  '2026-11-13',
  '2026-11-14',
  '2026-11-15',
  '2026-11-16',
  TODAY,
]

const overview = (
  overrides: Partial<NutritionOverview> = {},
): NutritionOverview => ({
  from: WEEK[0],
  to: TODAY,
  totalDays: 7,
  daysWithMeals: 2,
  days: WEEK.map((date) =>
    date === '2026-11-13' || date === TODAY
      ? dailySummary({ date })
      : emptyDailySummary(date),
  ),
  ...overrides,
})

const renderSection = () => {
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
      <NutritionSection athleteId={ATHLETE_ID} />
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  vi.mocked(getNutritionOverview).mockReset()
  vi.mocked(getDailyNutritionSummary).mockReset()
  vi.mocked(getMealsOfDay).mockReset()
  vi.mocked(putMealReview).mockReset()
  saveSession(session('COACH'))
  // solo se fija la fecha (mediodía en Buenos Aires); los timers siguen siendo reales
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date('2026-11-17T15:00:00Z'))
})

afterEach(() => {
  vi.useRealTimers()
})

describe('NutritionSection (US-25)', () => {
  it('abre la semana actual con la constancia y el resumen de cada día', async () => {
    vi.mocked(getNutritionOverview).mockResolvedValue(overview())
    renderSection()

    expect(
      await screen.findByText('2 de 7 días con comidas'),
    ).toBeInTheDocument()
    // sin total de pendientes en el rango: la revisión se ve por comida, en el día
    expect(
      screen.queryByText(/pendientes? de revisión/),
    ).not.toBeInTheDocument()
    expect(getNutritionOverview).toHaveBeenCalledWith(ATHLETE_ID, {
      from: '2026-11-11',
      to: TODAY,
    })
    const days = within(
      screen.getByRole('list', { name: 'Días de la semana' }),
    ).getAllByRole('button')
    expect(days).toHaveLength(7)
    expect(days[2]).toHaveTextContent('viernes, 13 de noviembre')
    expect(days[2]).toHaveTextContent('507,5 kcal')
    expect(days[0]).toHaveTextContent('Sin comidas')
    // la semana actual no tiene siguiente
    expect(
      screen.getByRole('button', { name: 'Semana siguiente' }),
    ).toBeDisabled()
  })

  it('navega a la semana anterior y vuelve a esta semana', async () => {
    const user = userEvent.setup()
    vi.mocked(getNutritionOverview).mockResolvedValue(overview())
    renderSection()
    await screen.findByText('2 de 7 días con comidas')

    await user.click(screen.getByRole('button', { name: 'Semana anterior' }))

    expect(getNutritionOverview).toHaveBeenLastCalledWith(ATHLETE_ID, {
      from: '2026-11-04',
      to: '2026-11-10',
    })
    expect(screen.getByRole('heading', { name: 'Semana' })).toHaveFocus()
    await user.click(
      screen.getByRole('button', { name: 'Volver a esta semana' }),
    )
    expect(getNutritionOverview).toHaveBeenLastCalledWith(ATHLETE_ID, {
      from: '2026-11-11',
      to: TODAY,
    })
  })

  it('sin comidas en la semana muestra el estado vacío', async () => {
    vi.mocked(getNutritionOverview).mockResolvedValue(
      overview({
        daysWithMeals: 0,
        days: WEEK.map((date) => emptyDailySummary(date)),
      }),
    )
    renderSection()

    expect(
      await screen.findByRole('heading', {
        name: 'Sin comidas registradas en estos días',
      }),
    ).toBeInTheDocument()
    expect(screen.getByText('0 de 7 días con comidas')).toBeInTheDocument()
    expect(
      screen.queryByRole('list', { name: 'Días de la semana' }),
    ).not.toBeInTheDocument()
  })

  it('un 403 muestra el motivo y no ofrece Reintentar', async () => {
    vi.mocked(getNutritionOverview).mockRejectedValue(
      new ApiError('No podés acceder a este atleta', 403),
    )
    renderSection()

    expect(
      await screen.findByText('No podés acceder a este atleta'),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Reintentar' }),
    ).not.toBeInTheDocument()
  })

  it('un 400 del rango muestra el mensaje del campo', async () => {
    vi.mocked(getNutritionOverview).mockRejectedValue(
      new ApiError('Datos inválidos', 400, {
        fieldErrors: [
          { field: 'to', message: 'El rango no puede superar los 31 días' },
        ],
      }),
    )
    renderSection()

    expect(
      await screen.findByText('El rango no puede superar los 31 días'),
    ).toBeInTheDocument()
  })

  it('elegir un día abre sus comidas con el estado de revisión y permite revisarlas', async () => {
    const user = userEvent.setup()
    const pending = meal({ id: 'pendiente', type: 'LUNCH' })
    const reviewed = meal({
      id: 'revisada',
      type: 'DINNER',
      review: {
        reviewedAt: '2026-11-14T15:00:00Z',
        observation: 'Buena cena',
      },
    })
    vi.mocked(getNutritionOverview).mockResolvedValue(overview())
    vi.mocked(getDailyNutritionSummary).mockResolvedValue(
      dailySummary({ date: '2026-11-13' }),
    )
    vi.mocked(getMealsOfDay).mockResolvedValue([pending, reviewed])
    vi.mocked(putMealReview).mockResolvedValue({
      ...pending,
      review: { reviewedAt: '2026-11-17T15:00:00Z', observation: null },
    })
    renderSection()

    await user.click(
      await screen.findByRole('button', {
        name: 'Ver las comidas del viernes, 13 de noviembre',
      }),
    )

    expect(getMealsOfDay).toHaveBeenCalledWith(ATHLETE_ID, '2026-11-13')
    expect(getDailyNutritionSummary).toHaveBeenCalledWith(
      ATHLETE_ID,
      '2026-11-13',
    )
    expect(await screen.findByText('Pendiente de revisión')).toBeInTheDocument()
    expect(screen.getByText(/Revisada el/)).toBeInTheDocument()
    expect(screen.getByText('Buena cena')).toBeInTheDocument()

    vi.mocked(getMealsOfDay).mockResolvedValue([
      {
        ...pending,
        review: { reviewedAt: '2026-11-17T15:00:00Z', observation: null },
      },
      reviewed,
    ])
    await user.click(screen.getByRole('button', { name: 'Revisar almuerzo' }))
    await user.click(
      screen.getByRole('button', { name: 'Marcar como revisada' }),
    )

    expect(
      await screen.findByText('Marcaste la comida como revisada.'),
    ).toBeInTheDocument()
    expect(putMealReview).toHaveBeenCalledWith(ATHLETE_ID, 'pendiente', {
      observation: undefined,
    })
    // la lista se vuelve a pedir: las dos comidas quedan revisadas
    await waitFor(() =>
      expect(screen.getAllByText(/Revisada el/)).toHaveLength(2),
    )
    expect(screen.queryByText('Pendiente de revisión')).not.toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Editar revisión de almuerzo' }),
    ).toHaveFocus()
  })

  it('un día sin comidas muestra el estado vacío y el siguiente no pasa de hoy', async () => {
    const user = userEvent.setup()
    vi.mocked(getNutritionOverview).mockResolvedValue(overview())
    vi.mocked(getDailyNutritionSummary).mockResolvedValue(
      emptyDailySummary(TODAY),
    )
    vi.mocked(getMealsOfDay).mockResolvedValue([])
    renderSection()

    await user.click(screen.getByRole('radio', { name: 'Día' }))

    expect(
      await screen.findByRole('heading', {
        name: 'No registró comidas ese día',
      }),
    ).toBeInTheDocument()
    expect(getMealsOfDay).toHaveBeenCalledWith(ATHLETE_ID, TODAY)
    expect(screen.getByRole('button', { name: 'Día siguiente' })).toBeDisabled()
    await user.click(screen.getByRole('button', { name: 'Día anterior' }))
    expect(getMealsOfDay).toHaveBeenLastCalledWith(ATHLETE_ID, '2026-11-16')
  })
})
