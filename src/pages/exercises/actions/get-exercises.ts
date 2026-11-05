import { get, type PageResponse } from '../../../lib/api'
import type { Exercise } from '../../../lib/exercises'
import type { ExerciseFilters } from '../types'

export const EXERCISES_PAGE_SIZE = 20

// globales del sistema + los propios del entrenador, ordenados por nombre
export const getExercises = ({ page, name, muscleGroup }: ExerciseFilters) =>
  get<PageResponse<Exercise>>('/exercises', {
    params: {
      // el backend pagina desde 0
      page: page - 1,
      size: EXERCISES_PAGE_SIZE,
      // texto vacío o en blanco no se envía
      name: name?.trim() || undefined,
      muscleGroup,
    },
  })
