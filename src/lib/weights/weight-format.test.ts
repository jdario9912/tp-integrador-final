import { describe, expect, it } from 'vitest'
import { formatWeightKg } from './weight-format'

describe('formatWeightKg', () => {
  it('muestra el peso con coma decimal y la unidad', () => {
    expect(formatWeightKg(72.5)).toBe('72,5 kg')
    expect(formatWeightKg(80.25)).toBe('80,25 kg')
    expect(formatWeightKg(62)).toBe('62 kg')
  })

  it('no muestra ceros finales ni más de 2 decimales', () => {
    expect(formatWeightKg(72.5)).toBe(formatWeightKg(Number('72.50')))
    expect(formatWeightKg(70.125)).toBe('70,13 kg')
  })
})
