import { describe, expect, it } from 'vitest'
import { createdRoutine } from '../../test/routine-fixtures'
import {
  emptyRoutineFormValues,
  toRoutineFormValues,
  toRoutineInput,
} from './mappers'

describe('toRoutineInput', () => {
  it('recorta el nombre y manda null en los opcionales vacíos', () => {
    expect(
      toRoutineInput({
        ...emptyRoutineFormValues,
        name: '  Fase de volumen ',
        goal: '   ',
        description: ' ',
      }),
    ).toEqual({
      name: 'Fase de volumen',
      description: null,
      goal: null,
      daysPerWeek: null,
      durationWeeks: null,
      isTemplate: false,
    })
  })

  it('convierte los números y mantiene los textos y la plantilla', () => {
    expect(
      toRoutineInput({
        name: 'Fuerza 5x5',
        goal: ' Fuerza máxima ',
        daysPerWeek: ' 3 ',
        durationWeeks: '12',
        description: ' Progresión lineal ',
        isTemplate: true,
      }),
    ).toEqual({
      name: 'Fuerza 5x5',
      description: 'Progresión lineal',
      goal: 'Fuerza máxima',
      daysPerWeek: 3,
      durationWeeks: 12,
      isTemplate: true,
    })
  })
})

describe('toRoutineFormValues', () => {
  it('deja vacíos los opcionales sin cargar', () => {
    expect(toRoutineFormValues(createdRoutine())).toEqual({
      ...emptyRoutineFormValues,
      name: 'Fase de volumen',
    })
  })

  it('precarga los datos guardados', () => {
    expect(
      toRoutineFormValues(
        createdRoutine({
          goal: 'Hipertrofia',
          daysPerWeek: 4,
          durationWeeks: 8,
          description: 'Bloque de acumulación',
          isTemplate: true,
        }),
      ),
    ).toEqual({
      name: 'Fase de volumen',
      goal: 'Hipertrofia',
      daysPerWeek: '4',
      durationWeeks: '8',
      description: 'Bloque de acumulación',
      isTemplate: true,
    })
  })
})
