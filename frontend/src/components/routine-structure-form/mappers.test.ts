import { describe, expect, it } from 'vitest'
import {
  routineDay,
  routineDetail,
  routineExercise,
} from '../../test/routine-fixtures'
import {
  isStructureFieldPath,
  newDayFormValues,
  newExerciseFormValues,
  normalizeRirRpe,
  toRoutineStructureInput,
  toStructureFormValues,
} from './mappers'
import type { RoutineStructureFormValues } from './types'

const saved = routineDetail({
  days: [
    routineDay({
      exercises: [
        routineExercise({
          recommendedWeight: 82.5,
          rest: 90,
          rirRpe: 'RIR 2',
          techniqueNote: 'Escápulas retraídas',
        }),
        routineExercise({ id: 'e2', exerciseId: 'x2', exerciseName: 'Fondos' }),
      ],
    }),
  ],
})

describe('toStructureFormValues', () => {
  it('precarga los días y ejercicios guardados con su id como clave', () => {
    const values = toStructureFormValues(saved)

    expect(values.days).toHaveLength(1)
    expect(values.days[0]).toMatchObject({
      key: saved.days[0].id,
      id: saved.days[0].id,
      name: 'Empuje',
    })
    expect(values.days[0].exercises[0]).toEqual({
      key: 'e1000000-0000-4000-8000-000000000001',
      id: 'e1000000-0000-4000-8000-000000000001',
      exerciseId: '3b2a1c0d-4e5f-4a6b-8c7d-9e0f1a2b3c4d',
      exerciseName: 'Press de banca',
      muscleGroup: 'CHEST',
      sets: '4',
      reps: '10',
      recommendedWeight: '82.5',
      rest: '90',
      rirRpe: 'RIR 2',
      techniqueNote: 'Escápulas retraídas',
    })
    expect(values.days[0].exercises[1]).toMatchObject({
      recommendedWeight: '',
      rest: '',
      rirRpe: '',
      techniqueNote: '',
    })
  })
})

describe('newDayFormValues y newExerciseFormValues', () => {
  it('arman ítems nuevos sin id y con claves distintas', () => {
    const first = newDayFormValues(1)
    const second = newDayFormValues(2)

    expect(first).toMatchObject({ id: null, name: 'Día 1', exercises: [] })
    expect(second.name).toBe('Día 2')
    expect(first.key).not.toBe(second.key)
  })

  it('el ejercicio nuevo toma nombre y grupo del catálogo y arranca vacío', () => {
    expect(
      newExerciseFormValues({ id: 'x1', name: 'Remo', muscleGroup: 'BACK' }),
    ).toMatchObject({
      id: null,
      exerciseId: 'x1',
      exerciseName: 'Remo',
      muscleGroup: 'BACK',
      sets: '',
      reps: '',
    })
  })
})

describe('normalizeRirRpe', () => {
  it.each([
    ['rir2', 'RIR 2'],
    [' RPE 8,5 ', 'RPE 8.5'],
    ['rpe 10', 'RPE 10'],
    ['', null],
  ])('%j se envía como %j', (value, expected) => {
    expect(normalizeRirRpe(value)).toBe(expected)
  })
})

describe('toRoutineStructureInput', () => {
  it('manda los guardados con id, los nuevos sin id y los opcionales vacíos en null', () => {
    const values = toStructureFormValues(saved)
    const day = newDayFormValues(2)
    const exercise = {
      ...newExerciseFormValues({ id: 'x3', name: 'Remo', muscleGroup: 'BACK' }),
      sets: ' 3 ',
      reps: '12',
      recommendedWeight: '40,5',
      rest: '60',
      rirRpe: 'rpe8',
      techniqueNote: '  ',
    }
    values.days[0].name = '  Empuje A '
    values.days.push({ ...day, exercises: [exercise] })

    expect(toRoutineStructureInput(values)).toEqual({
      days: [
        {
          id: saved.days[0].id,
          name: 'Empuje A',
          exercises: [
            {
              id: 'e1000000-0000-4000-8000-000000000001',
              exerciseId: '3b2a1c0d-4e5f-4a6b-8c7d-9e0f1a2b3c4d',
              sets: 4,
              reps: 10,
              recommendedWeight: 82.5,
              rest: 90,
              rirRpe: 'RIR 2',
              techniqueNote: 'Escápulas retraídas',
            },
            {
              id: 'e2',
              exerciseId: 'x2',
              sets: 4,
              reps: 10,
              recommendedWeight: null,
              rest: null,
              rirRpe: null,
              techniqueNote: null,
            },
          ],
        },
        {
          name: 'Día 2',
          exercises: [
            {
              exerciseId: 'x3',
              sets: 3,
              reps: 12,
              recommendedWeight: 40.5,
              rest: 60,
              rirRpe: 'RPE 8',
              techniqueNote: null,
            },
          ],
        },
      ],
    })
  })
})

describe('isStructureFieldPath', () => {
  const values: RoutineStructureFormValues = toStructureFormValues(saved)

  it.each([
    'days[0].name',
    'days[0].exercises[0].sets',
    'days[0].exercises[1].rirRpe',
    'days[0].exercises[1].techniqueNote',
  ])('%s es un campo editable', (path) => {
    expect(isStructureFieldPath(values, path)).toBe(true)
  })

  it.each([
    'days',
    'days[0].exercises',
    'days[0].exercises[0].exerciseId',
    'days[1].name',
    'days[0].exercises[2].sets',
    'days[0].id',
  ])('%s va al aviso general', (path) => {
    expect(isStructureFieldPath(values, path)).toBe(false)
  })
})
