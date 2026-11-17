import { useTrainingHistory } from '../../../lib/training-sessions'
import { HISTORY_PAGE_SIZE, latestObservations } from '../dashboard-format'

// las últimas observaciones del entrenador: sesiones cerradas revisadas con texto (US-21). Se pide
// el historial reciente y se filtra acá, porque el listado no tiene un filtro por revisión
export const useTrainerObservations = (athleteId: string) => {
  const history = useTrainingHistory(athleteId, { size: HISTORY_PAGE_SIZE })
  return {
    ...history,
    observations: history.data
      ? latestObservations(history.data.content)
      : undefined,
  }
}
