import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../../../lib/auth'
import { getRoutine } from '../actions/get-routine'

// bajo ['routines']: el invalidate de las mutaciones de rutinas también refresca el detalle
export const routineDetailKey = (userId: string | undefined, id: string) => [
  'routines',
  userId,
  'detail',
  id,
]

export const useRoutine = (id: string) => {
  const { user } = useAuth()
  return useQuery({
    queryKey: routineDetailKey(user?.id, id),
    queryFn: () => getRoutine(id),
    enabled: user !== null,
  })
}
