import { put } from '../../../lib/api'
import type { Exercise, ExerciseInput } from '../../../lib/exercises'

// edición completa: un opcional en null borra el dato
export const updateExercise = (id: string, input: ExerciseInput) =>
  put<Exercise, ExerciseInput>(`/exercises/${id}`, input)
