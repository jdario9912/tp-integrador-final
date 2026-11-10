import { useWeights, type WeightsQuery } from '../../../lib/weights'

// los 10 más recientes: el orden es por fecha descendente (contrato de API, 8.6)
export const LATEST_WEIGHTS_QUERY = { size: 10 } satisfies WeightsQuery

export const useLatestWeights = (athleteId: string) =>
  useWeights(athleteId, LATEST_WEIGHTS_QUERY)
