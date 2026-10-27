import { describe, expect, it } from 'vitest'
import { toCreateAthleteInput } from './to-create-athlete-input'
import type { RegisterAthleteFormValues } from './types'

const emptyOptionals: Omit<
  RegisterAthleteFormValues,
  'firstName' | 'lastName' | 'email' | 'password'
> = {
  phone: '',
  sex: '',
  experienceLevel: '',
  birthDate: '',
  heightCm: '',
  initialWeightKg: '',
  goal: '',
  injuries: '',
  limitations: '',
  availableDays: '',
  startDate: '',
}

describe('toCreateAthleteInput', () => {
  it('recorta espacios, conserva la contraseña y omite opcionales vacíos', () => {
    expect(
      toCreateAthleteInput({
        firstName: ' Juana ',
        lastName: 'Pérez ',
        email: ' juana@example.com',
        password: ' clave 123 ',
        ...emptyOptionals,
        phone: '   ',
      }),
    ).toEqual({
      firstName: 'Juana',
      lastName: 'Pérez',
      email: 'juana@example.com',
      password: ' clave 123 ',
      phone: undefined,
      sex: undefined,
      experienceLevel: undefined,
      birthDate: undefined,
      heightCm: undefined,
      initialWeightKg: undefined,
      goal: undefined,
      injuries: undefined,
      limitations: undefined,
      availableDays: undefined,
      startDate: undefined,
    })
  })

  it('convierte medidas y días a número y mantiene enums y fechas', () => {
    expect(
      toCreateAthleteInput({
        firstName: 'Juana',
        lastName: 'Pérez',
        email: 'juana@example.com',
        password: '12345678',
        phone: ' 1155550000 ',
        sex: 'FEMALE',
        experienceLevel: 'INTERMEDIATE',
        birthDate: '1995-04-12',
        heightCm: '165.5',
        initialWeightKg: '62',
        goal: ' Hipertrofia ',
        injuries: 'Rodilla izquierda',
        limitations: '',
        availableDays: '4',
        startDate: '2026-11-02',
      }),
    ).toEqual({
      firstName: 'Juana',
      lastName: 'Pérez',
      email: 'juana@example.com',
      password: '12345678',
      phone: '1155550000',
      sex: 'FEMALE',
      experienceLevel: 'INTERMEDIATE',
      birthDate: '1995-04-12',
      heightCm: 165.5,
      initialWeightKg: 62,
      goal: 'Hipertrofia',
      injuries: 'Rodilla izquierda',
      limitations: undefined,
      availableDays: 4,
      startDate: '2026-11-02',
    })
  })
})
