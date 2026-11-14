import type { QueryClient } from '@tanstack/react-query'
import {
  inProgressSessionKey,
  trainingSessionKey,
} from './training-session-keys'
import type { TrainingSession } from './types'

// una sesión finalizada o cancelada (US-20): su detalle pasa a tener el estado nuevo, sin
// invalidar. Si era la que estaba en progreso, ya no hay ninguna: la caché queda en null, igual
// que la respuesta 204 de in-progress. Si la caché de in-progress es de otra sesión, no se toca
export const storeEndedSession = (
  queryClient: QueryClient,
  userId: string | undefined,
  athleteId: string,
  session: TrainingSession,
) => {
  queryClient.setQueryData(
    trainingSessionKey(userId, athleteId, session.id),
    session,
  )
  const inProgressKey = inProgressSessionKey(userId, athleteId)
  if (
    queryClient.getQueryData<TrainingSession | null>(inProgressKey)?.id ===
    session.id
  ) {
    queryClient.setQueryData<TrainingSession | null>(inProgressKey, null)
  }
}
