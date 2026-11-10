import { queryOptions, useQuery } from '@tanstack/react-query'
import { useAuth } from '../auth'
import { getWeights } from './get-weights'
import type { WeightsQuery } from './types'

// todos los registros de un atleta cuelgan de esta clave: las mutaciones la invalidan
// y así se refrescan la lista, el último peso y cualquier rango (US-29).
// El id del usuario va en la clave: si cambia la sesión no se muestran datos del anterior
export const athleteWeightsKey = (
  userId: string | undefined,
  athleteId: string,
) => ['weights', userId, athleteId]

export const weightsQueryOptions = (
  userId: string | undefined,
  athleteId: string,
  query: WeightsQuery = {},
) =>
  queryOptions({
    queryKey: [...athleteWeightsKey(userId, athleteId), query],
    queryFn: () => getWeights(athleteId, query),
  })

export const useWeights = (athleteId: string, query: WeightsQuery = {}) => {
  const { user } = useAuth()
  return useQuery({
    ...weightsQueryOptions(user?.id, athleteId, query),
    enabled: user !== null && athleteId !== '',
  })
}
