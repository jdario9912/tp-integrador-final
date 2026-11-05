import type { Exercise, ExerciseInput } from '../../lib/exercises'
import type { ExerciseFormValues } from './types'

export const emptyExerciseFormValues: ExerciseFormValues = {
  name: '',
  muscleGroup: '',
  description: '',
  videoUrl: '',
}

// precarga la edición: los opcionales sin cargar quedan vacíos
export const toExerciseFormValues = (
  exercise: Exercise,
): ExerciseFormValues => ({
  name: exercise.name,
  muscleGroup: exercise.muscleGroup,
  description: exercise.description ?? '',
  videoUrl: exercise.videoUrl ?? '',
})

// null y no undefined: en la edición vaciar un campo tiene que borrar el dato guardado.
// Se llama después de validar, así que el grupo muscular nunca llega vacío
export const toExerciseInput = (values: ExerciseFormValues): ExerciseInput => ({
  name: values.name.trim(),
  muscleGroup: values.muscleGroup as ExerciseInput['muscleGroup'],
  description: values.description.trim() || null,
  videoUrl: values.videoUrl.trim() || null,
})
