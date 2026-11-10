import { get, type PageResponse } from '../../../lib/api'
import type { Exercise, MuscleGroupCode } from '../../../lib/exercises'

// el buscador muestra solo los primeros resultados: para encontrar otro se refina la búsqueda
export const EXERCISE_SEARCH_SIZE = 20

export type ExerciseSearch = { name: string; muscleGroup?: MuscleGroupCode }

// globales del sistema + los propios del entrenador, ordenados por nombre
export const searchExercises = ({ name, muscleGroup }: ExerciseSearch) =>
  get<PageResponse<Exercise>>('/exercises', {
    params: {
      page: 0,
      size: EXERCISE_SEARCH_SIZE,
      // texto vacío o en blanco no se envía
      name: name.trim() || undefined,
      muscleGroup,
    },
  })
