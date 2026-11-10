import { usePrefetchQuery } from '@tanstack/react-query'
import { useAuth } from '../../../lib/auth'
import {
  useWeights,
  weightsQueryOptions,
  type WeightsQuery,
} from '../../../lib/weights'

// el último peso es el primer registro: el orden es por fecha descendente (contrato de API, 5.1)
const LATEST_WEIGHT_QUERY = { size: 1 } satisfies WeightsQuery

export const useLatestWeight = (athleteId: string) =>
  useWeights(athleteId, LATEST_WEIGHT_QUERY)

// la ficha pide el atleta y el último peso en paralelo (5.1): la sección lo encuentra en caché
export const usePrefetchLatestWeight = (athleteId: string) => {
  const { user } = useAuth()
  usePrefetchQuery(
    weightsQueryOptions(user?.id, athleteId, LATEST_WEIGHT_QUERY),
  )
}
