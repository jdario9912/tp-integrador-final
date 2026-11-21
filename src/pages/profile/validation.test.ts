import { describe, expect, it } from 'vitest'
import { validateConfirmPassword, validateCurrentPassword } from './validation'

describe('validateConfirmPassword (US-48)', () => {
  it('pide repetir la contraseña nueva', () => {
    expect(validateConfirmPassword('', 'nueva-4567')).toBe(
      'Repetí la contraseña nueva',
    )
  })

  it('exige que sea igual a la nueva, espacios incluidos', () => {
    expect(validateConfirmPassword('nueva-4567 ', 'nueva-4567')).toBe(
      'Las contraseñas no coinciden',
    )
  })

  it('acepta la confirmación exacta', () => {
    expect(validateConfirmPassword('nueva-4567', 'nueva-4567')).toBeUndefined()
  })
})

describe('validateCurrentPassword (US-48)', () => {
  it('la contraseña actual es obligatoria', () => {
    expect(validateCurrentPassword({ value: '' })).toBe(
      'Ingresá tu contraseña actual',
    )
  })

  it('cualquier valor no vacío pasa: la comparación la hace el servidor', () => {
    expect(validateCurrentPassword({ value: 'vieja' })).toBeUndefined()
  })
})
