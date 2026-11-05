import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../auth'
import { getMuscleGroups } from './get-muscle-groups'

// catálogo fijo del sistema: se pide una sola vez por sesión. Lo usan el listado, el filtro
// y el formulario de ejercicios
export const useMuscleGroups = () => {
  const { user } = useAuth()
  return useQuery({
    queryKey: ['muscle-groups'],
    queryFn: getMuscleGroups,
    enabled: user !== null,
    staleTime: Infinity,
  })
}
