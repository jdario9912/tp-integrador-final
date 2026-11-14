import { describe, expect, it } from 'vitest'
import {
  validateReps,
  validateRpe,
  validateSkipReason,
  validateWeight,
} from './validation'

describe('validateWeight', () => {
  it.each(['0', '62,5', '62.5', '9999,99', '120'])('acepta %s', (value) => {
    expect(validateWeight(value)).toBeUndefined()
  })

  it('pide el peso si está vacío', () => {
    expect(validateWeight('  ')).toBe('Ingresá el peso de una serie realizada')
  })

  it('rechaza un peso negativo con su mensaje', () => {
    expect(validateWeight('-5')).toBe('El peso no puede ser negativo')
  })

  it.each(['10000', '9999,999', '1,2,3', 'abc'])(
    'rechaza %s con el rango del backend',
    (value) => {
      expect(validateWeight(value)).toBe('El peso debe estar entre 0 y 9999,99')
    },
  )
})

describe('validateReps', () => {
  it.each(['1', '8', '999'])('acepta %s', (value) => {
    expect(validateReps(value)).toBeUndefined()
  })

  it('pide las repeticiones si están vacías', () => {
    expect(validateReps('')).toBe(
      'Ingresá las repeticiones de una serie realizada',
    )
  })

  it.each(['0', '1000', '8,5', '-2'])('rechaza %s', (value) => {
    expect(validateReps(value)).toBe(
      'Las repeticiones deben estar entre 1 y 999',
    )
  })
})

describe('validateRpe', () => {
  it('es opcional: vacío es válido', () => {
    expect(validateRpe('')).toBeUndefined()
    expect(validateRpe('  ')).toBeUndefined()
  })

  it.each(['1', '7', '10'])('acepta %s', (value) => {
    expect(validateRpe(value)).toBeUndefined()
  })

  it.each(['0', '11', '7,5'])('rechaza %s', (value) => {
    expect(validateRpe(value)).toBe('El RPE debe estar entre 1 y 10')
  })
})

describe('validateSkipReason', () => {
  it('pide el motivo si está vacío o son solo espacios', () => {
    expect(validateSkipReason('   ')).toBe(
      'Ingresá el motivo de una serie omitida',
    )
  })

  it('acepta hasta 200 caracteres', () => {
    expect(validateSkipReason('a'.repeat(200))).toBeUndefined()
  })

  it('rechaza más de 200 caracteres', () => {
    expect(validateSkipReason('a'.repeat(201))).toBe(
      'El motivo no puede superar los 200 caracteres',
    )
  })
})
