import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../auth'
import { getTrainingSession } from './get-training-session'
import {
  inProgressSessionKey,
  trainingSessionKey,
} from './training-session-keys'
import type { TrainingSession } from './types'

// detalle de una sesión del atleta. Al retomar desde «Mi rutina» la sesión en progreso ya está en
// la caché: se muestra al instante (initialData, con la fecha de esa consulta) y se vuelve a
// pedir en segundo plano, porque el día se lee en vivo
export const useTrainingSession = (athleteId: string, sessionId: string) => {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const inProgressKey = inProgressSessionKey(user?.id, athleteId)

  return useQuery({
    queryKey: trainingSessionKey(user?.id, athleteId, sessionId),
    queryFn: () => getTrainingSession(athleteId, sessionId),
    enabled: user !== null && athleteId !== '' && sessionId !== '',
    initialData: () => {
      const inProgress = queryClient.getQueryData<TrainingSession | null>(
        inProgressKey,
      )
      return inProgress?.id === sessionId ? inProgress : undefined
    },
    initialDataUpdatedAt: () =>
      queryClient.getQueryState(inProgressKey)?.dataUpdatedAt,
  })
}
