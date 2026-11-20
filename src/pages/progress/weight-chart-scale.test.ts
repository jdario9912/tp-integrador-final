import { describe, expect, it } from 'vitest'
import {
  describeWeightChart,
  formatChartDate,
  niceYAxis,
  pickLabelIndexes,
  toChartPoints,
  xFor,
  yFor,
} from './weight-chart-scale'

describe('toChartPoints', () => {
  it('ordena de la más antigua a la más nueva sin tocar la lista original', () => {
    const records = [
      { date: '2026-11-06', weightKg: 72.5 },
      { date: '2026-11-01', weightKg: 73.1 },
    ]

    const points = toChartPoints(records)

    expect(points.map(({ date }) => date)).toEqual(['2026-11-01', '2026-11-06'])
    expect(records[0].date).toBe('2026-11-06')
    expect(points[0]).toMatchObject({ value: 73.1 })
  })

  it('una lista vacía da una lista vacía', () => {
    expect(toChartPoints([])).toEqual([])
  })
})

describe('niceYAxis', () => {
  it('redondea los ticks y contiene todos los valores', () => {
    const axis = niceYAxis([72.5, 73.1, 71.8])

    expect(axis.min).toBeLessThanOrEqual(71.8)
    expect(axis.max).toBeGreaterThanOrEqual(73.1)
    expect(axis.ticks[0]).toBe(axis.min)
    expect(axis.ticks.at(-1)).toBe(axis.max)
    expect(
      axis.ticks.every((tick, i, all) => i === 0 || tick > all[i - 1]),
    ).toBe(true)
    expect(axis.ticks.every((tick) => Number.isFinite(tick))).toBe(true)
  })

  it('con un solo valor no divide por cero y deja un rango visible', () => {
    const axis = niceYAxis([72.5])

    expect(axis.max - axis.min).toBeGreaterThanOrEqual(2)
    expect(axis.min).toBeLessThan(72.5)
    expect(axis.max).toBeGreaterThan(72.5)
    expect(axis.ticks.length).toBeGreaterThan(1)
  })

  it('valores muy distintos siguen con ticks finitos y ordenados', () => {
    const axis = niceYAxis([20, 300])

    expect(axis.min).toBeGreaterThanOrEqual(0)
    expect(axis.min).toBeLessThanOrEqual(20)
    expect(axis.max).toBeGreaterThanOrEqual(300)
    expect(axis.ticks.length).toBeLessThan(15)
  })
})

describe('coordenadas', () => {
  it('Y crece hacia arriba: el valor más alto queda más arriba', () => {
    const axis = { min: 70, max: 80, ticks: [] }
    const high = yFor(80, axis, 0, 100)
    const low = yFor(70, axis, 0, 100)

    expect(high).toBe(0)
    expect(low).toBe(100)
    expect(yFor(75, axis, 0, 100)).toBe(50)
  })

  it('X es proporcional al día dentro del área de dibujo', () => {
    const first = 0
    const last = 10
    expect(xFor(0, first, last, 40, 200)).toBe(40)
    expect(xFor(5, first, last, 40, 200)).toBe(140)
    expect(xFor(10, first, last, 40, 200)).toBe(240)
  })

  it('un solo día cae al centro, sin dividir por cero', () => {
    expect(xFor(7, 7, 7, 40, 200)).toBe(140)
  })
})

describe('pickLabelIndexes', () => {
  it('etiqueta todos los puntos si caben', () => {
    expect(pickLabelIndexes(3, 5)).toEqual([0, 1, 2])
  })

  it('si no caben, incluye siempre el primero y el último', () => {
    const indexes = pickLabelIndexes(100, 4)

    expect(indexes).toHaveLength(4)
    expect(indexes[0]).toBe(0)
    expect(indexes.at(-1)).toBe(99)
  })

  it('un punto se etiqueta una vez', () => {
    expect(pickLabelIndexes(1, 1)).toEqual([0])
  })
})

describe('textos del gráfico', () => {
  it('la fecha corta del eje es día y mes abreviado en español', () => {
    // la abreviatura exacta depende de la ICU del navegador: se compara el día y el mes
    expect(formatChartDate('2026-11-06')).toMatch(/^6 nov/)
  })

  it('describe el rango para lectores de pantalla', () => {
    expect(
      describeWeightChart(
        toChartPoints([
          { date: '2026-11-01', weightKg: 73.1 },
          { date: '2026-11-06', weightKg: 72.5 },
        ]),
      ),
    ).toBe(
      '2 registros, del 1 de noviembre de 2026 al 6 de noviembre de 2026. De 73,1 kg a 72,5 kg.',
    )
  })

  it('con un solo registro lo dice en singular y sin lista vacía', () => {
    expect(
      describeWeightChart(
        toChartPoints([{ date: '2026-11-06', weightKg: 72.5 }]),
      ),
    ).toMatch(
      /^1 registro, del 6 de noviembre de 2026 al 6 de noviembre de 2026/,
    )
    expect(describeWeightChart([])).toBe('Sin registros en este rango')
  })
})
