import { describe, expect, it } from 'vitest'
import { createdExercise } from '../../test/exercise-fixtures'
import {
  emptyExerciseFormValues,
  toExerciseFormValues,
  toExerciseInput,
} from './mappers'

describe('toExerciseFormValues', () => {
  it('deja vacíos los opcionales sin cargar', () => {
    expect(toExerciseFormValues(createdExercise())).toEqual({
      name: 'Press de banca',
      muscleGroup: 'CHEST',
      description: '',
      videoUrl: '',
    })
  })

  it('precarga descripción y video', () => {
    expect(
      toExerciseFormValues(
        createdExercise({
          description: 'Agarre medio',
          videoUrl: 'https://youtu.be/abc',
        }),
      ),
    ).toMatchObject({
      description: 'Agarre medio',
      videoUrl: 'https://youtu.be/abc',
    })
  })
})

describe('toExerciseInput', () => {
  it('recorta espacios y manda null en los opcionales vacíos', () => {
    expect(
      toExerciseInput({
        ...emptyExerciseFormValues,
        name: '  Remo con barra ',
        muscleGroup: 'BACK',
        description: '   ',
      }),
    ).toEqual({
      name: 'Remo con barra',
      muscleGroup: 'BACK',
      description: null,
      videoUrl: null,
    })
  })

  it('mantiene descripción y video', () => {
    expect(
      toExerciseInput({
        name: 'Sentadilla',
        muscleGroup: 'QUADRICEPS',
        description: ' Profunda ',
        videoUrl: ' https://youtu.be/abc ',
      }),
    ).toEqual({
      name: 'Sentadilla',
      muscleGroup: 'QUADRICEPS',
      description: 'Profunda',
      videoUrl: 'https://youtu.be/abc',
    })
  })
})
