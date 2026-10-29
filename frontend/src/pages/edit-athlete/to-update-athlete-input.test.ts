import { describe, expect, it } from 'vitest'
import { emptyAthleteFormValues } from '../../components/athlete-form'
import { toUpdateAthleteInput } from './to-update-athlete-input'

describe('toUpdateAthleteInput', () => {
  it('manda null en los opcionales vacíos para borrarlos y no manda la contraseña', () => {
    expect(
      toUpdateAthleteInput({
        ...emptyAthleteFormValues,
        firstName: ' Juana ',
        lastName: 'Pérez ',
        email: ' juana@example.com',
        password: 'no se envía',
        phone: '   ',
      }),
    ).toEqual({
      firstName: 'Juana',
      lastName: 'Pérez',
      email: 'juana@example.com',
      phone: null,
      sex: null,
      experienceLevel: null,
      birthDate: null,
      heightCm: null,
      initialWeightKg: null,
      goal: null,
      injuries: null,
      limitations: null,
      availableDays: null,
      startDate: null,
    })
  })

  it('convierte medidas y días a número y mantiene enums y fechas', () => {
    expect(
      toUpdateAthleteInput({
        ...emptyAthleteFormValues,
        firstName: 'Juana',
        lastName: 'Pérez',
        email: 'juana@example.com',
        phone: ' 1155550000 ',
        sex: 'FEMALE',
        experienceLevel: 'INTERMEDIATE',
        birthDate: '1995-04-12',
        heightCm: '165.5',
        initialWeightKg: '62',
        goal: ' Hipertrofia ',
        injuries: 'Rodilla',
        limitations: '',
        availableDays: '4',
        startDate: '2026-11-02',
      }),
    ).toEqual({
      firstName: 'Juana',
      lastName: 'Pérez',
      email: 'juana@example.com',
      phone: '1155550000',
      sex: 'FEMALE',
      experienceLevel: 'INTERMEDIATE',
      birthDate: '1995-04-12',
      heightCm: 165.5,
      initialWeightKg: 62,
      goal: 'Hipertrofia',
      injuries: 'Rodilla',
      limitations: null,
      availableDays: 4,
      startDate: '2026-11-02',
    })
  })
})
