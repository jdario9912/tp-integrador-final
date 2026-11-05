import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { useAuth } from '../../../lib/auth'
import { getExercises } from '../actions/get-exercises'
import type { ExerciseFilters } from '../types'

// el id del entrenador va en la key: cada uno ve sus propios ejercicios además de los globales.
// keepPreviousData: al paginar o filtrar la grilla sigue visible hasta que llega la nueva página
export const useExercises = (filters: ExerciseFilters) => {
  const { user } = useAuth()
  return useQuery({
    queryKey: ['exercises', user?.id, filters],
    queryFn: () => getExercises(filters),
    enabled: user !== null,
    placeholderData: keepPreviousData,
  })
}
