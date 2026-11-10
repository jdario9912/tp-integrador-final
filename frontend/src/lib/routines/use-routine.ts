import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../auth'
import { getRoutine } from './get-routine'

// bajo ['routines']: el invalidate de las mutaciones de rutinas también refresca el detalle.
// La comparten el detalle, la edición y la estructura: al pasar de una a otra se muestra al instante
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
