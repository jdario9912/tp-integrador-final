import { describe, expect, it } from 'vitest'
import { validateEmail, validateRequired } from './validation'

describe('validateRequired', () => {
  const validate = validateRequired('El nombre es obligatorio')

  it.each(['', '   '])('rechaza %j', (value) => {
    expect(validate({ value })).toBe('El nombre es obligatorio')
  })

  it('acepta un valor con texto', () => {
    expect(validate({ value: ' Ana ' })).toBeUndefined()
  })
})

describe('validateEmail', () => {
  it('pide el email si está vacío', () => {
    expect(validateEmail({ value: '  ' })).toBe('El email es obligatorio')
  })

  it.each(['ana', 'ana@', '@example.com', 'ana@example'])(
    'rechaza %j',
    (value) => {
      expect(validateEmail({ value })).toBe('El email no es válido')
    },
  )

  it('acepta un email válido aunque tenga espacios alrededor', () => {
    expect(validateEmail({ value: ' ana@example.com ' })).toBeUndefined()
  })
})
