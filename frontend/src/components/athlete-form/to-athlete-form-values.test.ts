import { describe, expect, it } from 'vitest'
import { createdAthlete } from '../../test/athlete-fixtures'
import { emptyAthleteFormValues } from './fields'
import { toAthleteFormValues } from './to-athlete-form-values'

describe('toAthleteFormValues', () => {
  it('deja vacíos los opcionales sin cargar y la contraseña', () => {
    expect(toAthleteFormValues(createdAthlete())).toEqual({
      ...emptyAthleteFormValues,
      firstName: 'Juana',
      lastName: 'Pérez',
      email: 'juana@example.com',
    })
  })

  it('convierte números a texto y mantiene enums y fechas', () => {
    expect(
      toAthleteFormValues(
        createdAthlete({
          phone: '1155550000',
          sex: 'FEMALE',
          experienceLevel: 'ADVANCED',
          birthDate: '1995-04-12',
          heightCm: 165.5,
          initialWeightKg: 62,
          goal: 'Hipertrofia',
          injuries: 'Rodilla',
          limitations: 'Sin barra',
          availableDays: 4,
          startDate: '2026-11-02',
        }),
      ),
    ).toEqual({
      firstName: 'Juana',
      lastName: 'Pérez',
      email: 'juana@example.com',
      password: '',
      phone: '1155550000',
      sex: 'FEMALE',
      experienceLevel: 'ADVANCED',
      birthDate: '1995-04-12',
      heightCm: '165.5',
      initialWeightKg: '62',
      goal: 'Hipertrofia',
      injuries: 'Rodilla',
      limitations: 'Sin barra',
      availableDays: '4',
      startDate: '2026-11-02',
    })
  })
})
