import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { useAuth } from '../auth'
import { getTrainingHistory } from './get-training-history'
import { trainingHistoryQueryKey } from './training-session-keys'
import type { TrainingHistoryQuery } from './types'

// historial paginado con filtro de fechas (US-21). keepPreviousData: al paginar o cambiar el rango
// la lista anterior sigue visible hasta que llega la nueva página
export const useTrainingHistory = (
  athleteId: string,
  query: TrainingHistoryQuery = {},
) => {
  const { user } = useAuth()
  return useQuery({
    queryKey: trainingHistoryQueryKey(user?.id, athleteId, query),
    queryFn: () => getTrainingHistory(athleteId, query),
    enabled: user !== null && athleteId !== '',
    placeholderData: keepPreviousData,
  })
}
