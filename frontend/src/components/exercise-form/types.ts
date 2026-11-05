import type { MuscleGroupCode } from '../../lib/exercises'

// en el formulario todos los campos son strings; el select vacío vale ''
export type ExerciseFormValues = {
  name: string
  muscleGroup: MuscleGroupCode | ''
  description: string
  videoUrl: string
}

export type ExerciseFieldName = keyof ExerciseFormValues
