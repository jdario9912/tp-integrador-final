import { describe, expect, it } from 'vitest'
import {
  validateDaysPerWeek,
  validateDescription,
  validateDurationWeeks,
  validateGoal,
  validateRoutineName,
} from './validation'

describe('validateRoutineName', () => {
  it.each(['', '   '])('exige el nombre (%j)', (value) => {
    expect(validateRoutineName({ value })).toBe('El nombre es obligatorio')
  })

  it('rechaza más de 100 caracteres sin contar los espacios de los bordes', () => {
    expect(validateRoutineName({ value: 'a'.repeat(101) })).toBe(
      'El nombre admite hasta 100 caracteres',
    )
    expect(
      validateRoutineName({ value: ` ${'a'.repeat(100)} ` }),
    ).toBeUndefined()
  })
})

describe('validateGoal', () => {
  it('acepta vacío y hasta 100 caracteres', () => {
    expect(validateGoal({ value: '' })).toBeUndefined()
    expect(validateGoal({ value: 'a'.repeat(100) })).toBeUndefined()
  })

  it('rechaza más de 100 caracteres', () => {
    expect(validateGoal({ value: 'a'.repeat(101) })).toBe(
      'El objetivo admite hasta 100 caracteres',
    )
  })
})

describe('validateDescription', () => {
  it('acepta vacío y hasta 500 caracteres', () => {
    expect(validateDescription({ value: '' })).toBeUndefined()
    expect(validateDescription({ value: 'a'.repeat(500) })).toBeUndefined()
  })

  it('rechaza más de 500 caracteres', () => {
    expect(validateDescription({ value: 'a'.repeat(501) })).toBe(
      'La descripción admite hasta 500 caracteres',
    )
  })
})

describe('validateDaysPerWeek', () => {
  it.each(['', '  ', '1', '7', ' 4 '])('acepta %j', (value) => {
    expect(validateDaysPerWeek({ value })).toBeUndefined()
  })

  it.each(['0', '8', '-1', '2.5', 'abc'])('rechaza %j', (value) => {
    expect(validateDaysPerWeek({ value })).toBe(
      'Los días por semana deben estar entre 1 y 7',
    )
  })
})

describe('validateDurationWeeks', () => {
  it.each(['', '1', '52', ' 12 '])('acepta %j', (value) => {
    expect(validateDurationWeeks({ value })).toBeUndefined()
  })

  it.each(['0', '53', '-4', '1.5', 'doce'])('rechaza %j', (value) => {
    expect(validateDurationWeeks({ value })).toBe(
      'La duración debe estar entre 1 y 52 semanas',
    )
  })
})
