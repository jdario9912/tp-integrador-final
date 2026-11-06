import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { useAuth } from '../../../lib/auth'
import { getRoutines } from '../actions/get-routines'
import type { RoutinesQuery } from '../types'

// el id del entrenador va en la key: cada uno ve solo sus rutinas.
// keepPreviousData: al paginar la grilla sigue visible hasta que llega la nueva página
export const useRoutines = (query: RoutinesQuery) => {
  const { user } = useAuth()
  return useQuery({
    queryKey: ['routines', user?.id, query],
    queryFn: () => getRoutines(query),
    enabled: user !== null,
    placeholderData: keepPreviousData,
  })
}
