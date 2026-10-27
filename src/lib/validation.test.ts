import { describe, expect, it } from 'vitest'
import { validateEmail, validatePassword, validateRequired } from './validation'

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

describe('validatePassword', () => {
  it('pide la contraseña si está vacía', () => {
    expect(validatePassword({ value: '' })).toBe('La contraseña es obligatoria')
  })

  it('exige al menos 8 caracteres', () => {
    expect(validatePassword({ value: '1234567' })).toBe(
      'La contraseña debe tener al menos 8 caracteres',
    )
  })

  it('acepta 8 caracteres o más, incluidos espacios', () => {
    expect(validatePassword({ value: ' clave 1 ' })).toBeUndefined()
  })
})
