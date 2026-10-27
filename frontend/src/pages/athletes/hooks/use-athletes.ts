import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { useAuth } from '../../../lib/auth'
import { getAthletes } from '../actions/get-athletes'
import type { AthleteFilters } from '../types'

// el id del entrenador va en la key: si cambia la sesión no se muestran atletas del anterior.
// keepPreviousData: al paginar o filtrar la grilla sigue visible hasta que llega la nueva página
export const useAthletes = (filters: AthleteFilters) => {
  const { user } = useAuth()
  return useQuery({
    queryKey: ['athletes', user?.id, filters],
    queryFn: () => getAthletes(filters),
    enabled: user !== null,
    placeholderData: keepPreviousData,
  })
}
