import type { MuscleGroupCode } from '../../lib/exercises'

// filtros del listado tal como los ve el usuario: page arranca en 1
export type ExerciseFilters = {
  page: number
  name?: string
  muscleGroup?: MuscleGroupCode
}
