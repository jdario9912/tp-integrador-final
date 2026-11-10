import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  normalizeDecimal,
  validateWeightComment,
  validateWeightDate,
  validateWeightKg,
} from './validation'

const value = (text: string) => ({ value: text })

describe('validateWeightDate', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('es obligatoria', () => {
    vi.setSystemTime(new Date('2026-11-06T15:00:00Z'))
    expect(validateWeightDate(value(''))).toBe('La fecha es obligatoria')
  })

  it('acepta hoy y días anteriores', () => {
    vi.setSystemTime(new Date('2026-11-06T15:00:00Z'))
    expect(validateWeightDate(value('2026-11-06'))).toBeUndefined()
    expect(validateWeightDate(value('2020-01-01'))).toBeUndefined()
  })

  it('rechaza una fecha futura', () => {
    vi.setSystemTime(new Date('2026-11-06T15:00:00Z'))
    expect(validateWeightDate(value('2026-11-07'))).toBe(
      'La fecha no puede ser futura',
    )
  })

  // 23:30 en Argentina = 02:30 del día siguiente en UTC: "mañana" sigue siendo futura
  it('compara con el día de Argentina y no con el de UTC', () => {
    vi.setSystemTime(new Date('2026-11-07T02:30:00Z'))
    expect(validateWeightDate(value('2026-11-06'))).toBeUndefined()
    expect(validateWeightDate(value('2026-11-07'))).toBe(
      'La fecha no puede ser futura',
    )
  })

  it('a la medianoche de Argentina el día nuevo ya es válido', () => {
    vi.setSystemTime(new Date('2026-11-07T03:00:00Z'))
    expect(validateWeightDate(value('2026-11-07'))).toBeUndefined()
  })
})

describe('validateWeightKg', () => {
  it.each(['', '   '])('es obligatorio (%j)', (text) => {
    expect(validateWeightKg(value(text))).toBe('El peso es obligatorio')
  })

  it('tiene que ser un número', () => {
    expect(validateWeightKg(value('abc'))).toBe('El peso debe ser un número')
  })

  it.each(['20', '300', '72.5', '72.55', ' 80 ', '72,5'])(
    'acepta %j (de 20 a 300, inclusive, hasta 2 decimales)',
    (text) => {
      expect(validateWeightKg(value(text))).toBeUndefined()
    },
  )

  it.each(['19.99', '300.01', '0', '-70', '1000.555'])(
    'rechaza %j por estar fuera de rango',
    (text) => {
      expect(validateWeightKg(value(text))).toBe(
        'El peso debe estar entre 20 y 300 kg',
      )
    },
  )

  it.each(['72.555', '80.001'])(
    'rechaza %j por tener más de 2 decimales',
    (text) => {
      expect(validateWeightKg(value(text))).toBe(
        'El peso admite hasta 3 enteros y 2 decimales',
      )
    },
  )
})

describe('validateWeightComment', () => {
  it('es opcional', () => {
    expect(validateWeightComment(value(''))).toBeUndefined()
  })

  it('acepta hasta 500 caracteres sin contar los espacios de los extremos', () => {
    expect(validateWeightComment(value('a'.repeat(500)))).toBeUndefined()
    expect(validateWeightComment(value(` ${'a'.repeat(500)} `))).toBeUndefined()
  })

  it('rechaza más de 500 caracteres', () => {
    expect(validateWeightComment(value('a'.repeat(501)))).toBe(
      'El comentario no puede superar los 500 caracteres',
    )
  })
})

describe('normalizeDecimal', () => {
  it('recorta y usa punto decimal', () => {
    expect(normalizeDecimal(' 72,5 ')).toBe('72.5')
    expect(normalizeDecimal('72.5')).toBe('72.5')
  })
})
