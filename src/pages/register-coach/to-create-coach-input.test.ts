import { describe, expect, it } from 'vitest'
import { toCreateCoachInput } from './to-create-coach-input'

describe('toCreateCoachInput', () => {
  it('recorta espacios, conserva la contraseña y omite opcionales vacíos', () => {
    expect(
      toCreateCoachInput({
        firstName: ' Ana ',
        lastName: 'Pérez ',
        email: ' ana@example.com',
        password: ' clave 123 ',
        phone: '   ',
        specialty: '',
        licenseNumber: ' MN-123 ',
        bio: '',
      }),
    ).toEqual({
      firstName: 'Ana',
      lastName: 'Pérez',
      email: 'ana@example.com',
      password: ' clave 123 ',
      phone: undefined,
      specialty: undefined,
      licenseNumber: 'MN-123',
      bio: undefined,
    })
  })
})
