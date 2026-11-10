import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../../../lib/auth'
import { getRoutineOptions } from '../actions/get-routine-options'

// bajo ['routines']: crear o duplicar una rutina también refresca las opciones.
// Se piden recién al abrir el formulario
export const useRoutineOptions = ({ enabled }: { enabled: boolean }) => {
  const { user } = useAuth()
  return useQuery({
    queryKey: ['routines', user?.id, 'options'],
    queryFn: getRoutineOptions,
    enabled: enabled && user !== null,
  })
}
