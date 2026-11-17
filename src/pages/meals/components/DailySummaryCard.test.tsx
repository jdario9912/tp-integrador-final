import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ApiError } from '../../../lib/api'
import {
  dailySummary,
  emptyDailySummary,
} from '../../../test/daily-summary-fixtures'
import { DailySummaryCard } from './DailySummaryCard'

const idle = {
  isPending: false,
  isRefreshing: false,
  error: null,
  onRetry: vi.fn(),
}

describe('DailySummaryCard · con datos', () => {
  it('muestra las calorías, los tres macros en gramos y las comidas del día', () => {
    render(<DailySummaryCard {...idle} summary={dailySummary()} />)

    expect(screen.getByText('507,5 kcal')).toBeInTheDocument()
    expect(screen.getByText('46,5 g')).toBeInTheDocument()
    expect(screen.getByText('56 g')).toBeInTheDocument()
    expect(screen.getByText('6 g')).toBeInTheDocument()
    expect(screen.getByText('2 comidas registradas')).toBeInTheDocument()
  })

  it('reparte los gramos en una barra con su lectura en texto', () => {
    render(<DailySummaryCard {...idle} summary={dailySummary()} />)

    // 46,5 / 56 / 6 gramos sobre 108,5: 43, 52 y 6 por ciento
    expect(
      screen.getByText(
        'Reparto por gramos: proteínas 43 %, carbohidratos 52 %, grasas 6 %.',
      ),
    ).toBeInTheDocument()
  })

  it('no muestra aviso ni barra si no hay comidas sin datos ni gramos', () => {
    render(<DailySummaryCard {...idle} summary={dailySummary()} />)

    expect(screen.queryByRole('note')).not.toBeInTheDocument()
  })
})

describe('DailySummaryCard · día vacío', () => {
  it('muestra 0 en todo y el estado de día sin comidas, sin barra', () => {
    render(<DailySummaryCard {...idle} summary={emptyDailySummary()} />)

    expect(screen.getByText('0 kcal')).toBeInTheDocument()
    expect(screen.getAllByText('0 g')).toHaveLength(3)
    expect(
      screen.getByText('Sin comidas registradas este día'),
    ).toBeInTheDocument()
    expect(screen.queryByText(/Reparto por gramos/)).not.toBeInTheDocument()
  })
})

describe('DailySummaryCard · comidas sin datos nutricionales', () => {
  it('avisa en singular cuando hay una comida sin datos', () => {
    render(
      <DailySummaryCard
        {...idle}
        summary={dailySummary({ mealsWithoutNutrition: 1 })}
      />,
    )

    expect(screen.getByRole('note')).toHaveTextContent(
      '1 comida sin datos nutricionales no se cuenta en el total.',
    )
  })

  it('avisa en plural cuando hay varias', () => {
    render(
      <DailySummaryCard
        {...idle}
        summary={dailySummary({ mealsWithoutNutrition: 2 })}
      />,
    )

    expect(
      screen.getByText(
        '2 comidas sin datos nutricionales no se cuentan en el total.',
      ),
    ).toBeInTheDocument()
  })
})

describe('DailySummaryCard · carga y error', () => {
  it('muestra un estado de carga mientras llega el resumen', () => {
    render(<DailySummaryCard {...idle} isPending summary={undefined} />)

    expect(
      screen.getByRole('status', { name: 'Cargando el resumen del día' }),
    ).toBeInTheDocument()
  })

  it('ante un error muestra su mensaje y Reintentar vuelve a pedirlo', async () => {
    const user = userEvent.setup()
    const onRetry = vi.fn()
    render(
      <DailySummaryCard
        {...idle}
        summary={undefined}
        error={new ApiError('No pudimos calcular el resumen', 500)}
        onRetry={onRetry}
      />,
    )

    expect(
      screen.getByText('No pudimos calcular el resumen'),
    ).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Reintentar' }))
    expect(onRetry).toHaveBeenCalledTimes(1)
  })
})
