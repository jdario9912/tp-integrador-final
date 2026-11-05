import { post } from '../../../lib/api'
import type { Exercise, ExerciseInput } from '../../../lib/exercises'

// queda como ejercicio propio del entrenador autenticado
export const createExercise = (input: ExerciseInput) =>
  post<Exercise, ExerciseInput>('/exercises', input)
