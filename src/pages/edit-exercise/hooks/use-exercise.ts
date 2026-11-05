import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../../../lib/auth'
import { getExercise } from '../actions/get-exercise'

// bajo ['exercises']: el invalidate de las mutaciones de ejercicios también refresca el detalle
export const exerciseDetailKey = (userId: string | undefined, id: string) => [
  'exercises',
  userId,
  'detail',
  id,
]

export const useExercise = (id: string) => {
  const { user } = useAuth()
  return useQuery({
    queryKey: exerciseDetailKey(user?.id, id),
    queryFn: () => getExercise(id),
    enabled: user !== null,
  })
}
