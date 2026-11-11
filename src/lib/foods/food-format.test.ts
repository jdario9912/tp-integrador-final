import { describe, expect, it } from 'vitest'
import { formatGrams, formatKcal } from './food-format'

describe('formatGrams', () => {
  it('muestra los gramos con coma decimal y la unidad', () => {
    expect(formatGrams(100)).toBe('100 g')
    expect(formatGrams(2.5)).toBe('2,5 g')
    expect(formatGrams(0)).toBe('0 g')
  })

  it('no muestra ceros finales ni más de 2 decimales', () => {
    expect(formatGrams(Number('3.10'))).toBe('3,1 g')
    expect(formatGrams(0.125)).toBe('0,13 g')
  })

  it('separa los miles con punto', () => {
    expect(formatGrams(10000)).toBe('10.000 g')
  })
})

describe('formatKcal', () => {
  it('muestra las calorías con coma decimal y la unidad', () => {
    expect(formatKcal(52)).toBe('52 kcal')
    expect(formatKcal(165.5)).toBe('165,5 kcal')
  })
})
