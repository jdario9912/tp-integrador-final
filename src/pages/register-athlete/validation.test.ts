import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  todayIsoDate,
  validateAvailableDays,
  validateMeasure,
  validatePastDate,
} from './validation'

describe('validateMeasure', () => {
  const validate = validateMeasure('La altura')

  it.each(['', '  '])('acepta el campo vacío %j', (value) => {
    expect(validate({ value })).toBeUndefined()
  })

  it.each(['0', '-5', 'abc'])('rechaza %j por no ser positivo', (value) => {
    expect(validate({ value })).toBe('La altura debe ser mayor a 0')
  })

  it.each(['1000', '65.123'])('rechaza %j por la precisión', (value) => {
    expect(validate({ value })).toBe(
      'La altura admite hasta 3 enteros y 2 decimales',
    )
  })

  it.each(['165', '165.5', '62.25'])('acepta %j', (value) => {
    expect(validate({ value })).toBeUndefined()
  })
})

describe('validateAvailableDays', () => {
  it.each(['0', '8', '2.5'])('rechaza %j', (value) => {
    expect(validateAvailableDays({ value })).toBe(
      'Los días disponibles deben estar entre 1 y 7',
    )
  })

  it.each(['', '1', '7'])('acepta %j', (value) => {
    expect(validateAvailableDays({ value })).toBeUndefined()
  })
})

describe('validatePastDate', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('usa la fecha local de hoy en formato ISO', () => {
    vi.useFakeTimers({ now: new Date(2026, 9, 7, 23, 30) })
    expect(todayIsoDate()).toBe('2026-10-07')
  })

  it.each(['2026-10-27', '2027-01-01'])(
    'rechaza hoy o después: %j',
    (value) => {
      vi.useFakeTimers({ now: new Date(2026, 9, 27, 12) })
      expect(validatePastDate({ value })).toBe(
        'La fecha de nacimiento debe ser anterior a hoy',
      )
    },
  )

  it.each(['', '1995-04-12'])('acepta %j', (value) => {
    vi.useFakeTimers({ now: new Date(2026, 9, 27, 12) })
    expect(validatePastDate({ value })).toBeUndefined()
  })
})
