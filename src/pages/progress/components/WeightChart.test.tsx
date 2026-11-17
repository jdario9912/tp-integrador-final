import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { toChartPoints } from '../weight-chart-scale'
import { WeightChart } from './WeightChart'

const points = (records: { date: string; weightKg: number }[]) =>
  toChartPoints(records)

describe('WeightChart', () => {
  it('se anuncia con su título y un texto que resume el rango', () => {
    render(
      <WeightChart
        points={points([
          { date: '2026-11-01', weightKg: 73.1 },
          { date: '2026-11-06', weightKg: 72.5 },
        ])}
      />,
    )

    const chart = screen.getByRole('img', { name: 'Evolución del peso' })
    expect(chart).toHaveAccessibleDescription(
      '2 registros, del 1 de noviembre de 2026 al 6 de noviembre de 2026. De 73,1 kg a 72,5 kg.',
    )
  })

  it('dibuja un punto por registro y la línea entre ellos', () => {
    const { container } = render(
      <WeightChart
        points={points([
          { date: '2026-11-01', weightKg: 73.1 },
          { date: '2026-11-03', weightKg: 72.8 },
          { date: '2026-11-06', weightKg: 72.5 },
        ])}
      />,
    )

    expect(container.querySelectorAll('circle')).toHaveLength(3)
    // la línea es un path con trazo; el área es otro path sin trazo
    expect(container.querySelectorAll('path.stroke-primary')).toHaveLength(1)
    // el último valor va debajo del gráfico; la tabla repite el dato, por eso se busca por su rótulo
    expect(screen.getByText('Último registro').parentElement).toHaveTextContent(
      '72,5 kg',
    )
  })

  it('con un solo registro dibuja solo el punto, sin línea, y lo explica (CE-3)', () => {
    const { container } = render(
      <WeightChart points={points([{ date: '2026-11-06', weightKg: 72.5 }])} />,
    )

    expect(container.querySelectorAll('circle')).toHaveLength(1)
    expect(container.querySelectorAll('path')).toHaveLength(0)
    expect(
      screen.getByText(
        'Con un solo registro se ve el punto. Cargá otro día para ver la línea.',
      ),
    ).toBeInTheDocument()
  })

  it('la tabla de datos lista cada día de la más antigua a la más nueva', () => {
    render(
      <WeightChart
        points={points([
          { date: '2026-11-06', weightKg: 72.5 },
          { date: '2026-11-01', weightKg: 73.1 },
        ])}
      />,
    )

    const rows = within(
      screen.getByRole('table', { name: 'Peso por día en el rango elegido' }),
    ).getAllByRole('row')
    // la primera fila es el encabezado
    expect(rows[1]).toHaveTextContent('1 de noviembre de 2026')
    expect(rows[1]).toHaveTextContent('73,1 kg')
    expect(rows[2]).toHaveTextContent('6 de noviembre de 2026')
    expect(rows[2]).toHaveTextContent('72,5 kg')
  })

  it('el eje Y muestra kilos con coma decimal', () => {
    render(
      <WeightChart
        points={points([
          { date: '2026-11-01', weightKg: 73.1 },
          { date: '2026-11-06', weightKg: 72.5 },
        ])}
      />,
    )

    // ticks de medio kilo: al menos uno con coma decimal
    expect(screen.getAllByText(/^\d+,5$/).length).toBeGreaterThan(0)
  })
})
