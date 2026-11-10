import { queryOptions, useQuery } from '@tanstack/react-query'
import { useAuth } from '../auth'
import { getAssignments } from './get-assignments'
import type { AssignmentsQuery } from './types'

// todas las páginas del historial de un atleta cuelgan de esta clave: asignar la invalida
// entera y se refrescan la rutina activa y el historial. No cuelga de ['athletes']: asignar
// no cambia el estado del atleta
export const athleteAssignmentsKey = (
  userId: string | undefined,
  athleteId: string,
) => ['assignments', userId, athleteId]

export const assignmentsQueryOptions = (
  userId: string | undefined,
  athleteId: string,
  query: AssignmentsQuery = {},
) =>
  queryOptions({
    queryKey: [...athleteAssignmentsKey(userId, athleteId), query],
    queryFn: () => getAssignments(athleteId, query),
  })

export const useAssignments = (
  athleteId: string,
  query: AssignmentsQuery = {},
) => {
  const { user } = useAuth()
  return useQuery({
    ...assignmentsQueryOptions(user?.id, athleteId, query),
    enabled: user !== null && athleteId !== '',
    // al paginar se mantiene la página anterior, pero nunca la de otro atleta
    placeholderData: (previous, previousQuery) =>
      previousQuery?.queryKey[2] === athleteId ? previous : undefined,
  })
}
