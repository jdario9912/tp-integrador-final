import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { useAuth } from '../../../lib/auth'
import {
  searchExercises,
  type ExerciseSearch,
} from '../actions/search-exercises'

// bajo ['exercises']: las mutaciones del catálogo también la invalidan. keepPreviousData: mientras
// se escribe la lista anterior sigue visible
export const useExerciseSearch = (search: ExerciseSearch) => {
  const { user } = useAuth()
  return useQuery({
    queryKey: ['exercises', user?.id, 'search', search],
    queryFn: () => searchExercises(search),
    enabled: user !== null,
    placeholderData: keepPreviousData,
  })
}
