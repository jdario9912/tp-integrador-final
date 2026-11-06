import { describe, expect, it } from 'vitest'
import { emptyRoutineFormValues, toRoutineInput } from './mappers'

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
