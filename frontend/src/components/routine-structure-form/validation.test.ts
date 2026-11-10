import { describe, expect, it } from 'vitest'
import {
  parseRirRpe,
  validateDayName,
  validateRecommendedWeight,
  validateReps,
  validateRest,
  validateRirRpe,
  validateSets,
  validateTechniqueNote,
} from './validation'

describe('validateDayName', () => {
  it.each(['', '   '])('exige el nombre (%j)', (value) => {
    expect(validateDayName({ value })).toBe('El nombre del día es obligatorio')
  })

  it('admite hasta 100 caracteres sin contar los espacios de los bordes', () => {
    expect(validateDayName({ value: ` ${'a'.repeat(100)} ` })).toBeUndefined()
    expect(validateDayName({ value: 'a'.repeat(101) })).toBe(
      'El nombre del día admite hasta 100 caracteres',
    )
  })
})

describe('validateSets', () => {
  it('es obligatorio', () => {
    expect(validateSets({ value: ' ' })).toBe('Las series son obligatorias')
  })

  it.each(['1', '99', ' 4 '])('acepta %j', (value) => {
    expect(validateSets({ value })).toBeUndefined()
  })

  it.each(['0', '100', '-1', '2.5', 'abc'])('rechaza %j', (value) => {
    expect(validateSets({ value })).toBe('Las series deben estar entre 1 y 99')
  })
})

describe('validateReps', () => {
  it('es obligatorio', () => {
    expect(validateReps({ value: '' })).toBe(
      'Las repeticiones son obligatorias',
    )
  })

  it.each(['1', '999'])('acepta %j', (value) => {
    expect(validateReps({ value })).toBeUndefined()
  })

  it.each(['0', '1000', '8.5'])('rechaza %j', (value) => {
    expect(validateReps({ value })).toBe(
      'Las repeticiones deben estar entre 1 y 999',
    )
  })
})

describe('validateRecommendedWeight', () => {
  it.each(['', '0', '80', '82.5', '82,25', '1000'])('acepta %j', (value) => {
    expect(validateRecommendedWeight({ value })).toBeUndefined()
  })

  it.each(['-5', '1000.5', 'abc', '1e3'])(
    'rechaza %j fuera de rango',
    (value) => {
      expect(validateRecommendedWeight({ value })).toBe(
        'El peso recomendado debe estar entre 0 y 1000 kg',
      )
    },
  )

  it('admite hasta 2 decimales', () => {
    expect(validateRecommendedWeight({ value: '80.125' })).toBe(
      'El peso recomendado admite hasta 2 decimales',
    )
  })
})

describe('validateRest', () => {
  it.each(['', '0', '90', '3600'])('acepta %j', (value) => {
    expect(validateRest({ value })).toBeUndefined()
  })

  it.each(['-1', '3601', '30.5'])('rechaza %j', (value) => {
    expect(validateRest({ value })).toBe(
      'El descanso debe estar entre 0 y 3600 segundos',
    )
  })
})

describe('validateRirRpe', () => {
  it.each([
    '',
    'RIR 0',
    'RIR 10',
    'rir2',
    'RPE 1',
    'RPE 8.5',
    'rpe 10',
    'RPE 7,5',
  ])('acepta %j', (value) => {
    expect(validateRirRpe({ value })).toBeUndefined()
  })

  it.each(['RIR 11', 'RIR 2.5', 'RPE 0', 'RPE 10.5', 'RPE 8.3', '8', 'RM 5'])(
    'rechaza %j',
    (value) => {
      expect(validateRirRpe({ value })).toBe(
        'Usá el formato RIR n (0 a 10) o RPE n (1 a 10)',
      )
    },
  )
})

describe('parseRirRpe', () => {
  it('separa la escala y el número', () => {
    expect(parseRirRpe(' rpe8,5 ')).toEqual({ scale: 'RPE', number: 8.5 })
    expect(parseRirRpe('RIR 3')).toEqual({ scale: 'RIR', number: 3 })
    expect(parseRirRpe('RIR')).toBeUndefined()
  })
})

describe('validateTechniqueNote', () => {
  it('admite hasta 500 caracteres', () => {
    expect(validateTechniqueNote({ value: 'a'.repeat(500) })).toBeUndefined()
    expect(validateTechniqueNote({ value: 'a'.repeat(501) })).toBe(
      'La nota técnica admite hasta 500 caracteres',
    )
  })
})
