import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../auth'
import { putSessionReview } from './put-session-review'
import { trainingHistoryKey, trainingSessionKey } from './training-session-keys'
import type { SessionReviewInput, TrainingSession } from './types'

// marcar revisada (o editar la revisión) una sesión finalizada (US-21). La respuesta reemplaza el
// detalle y se invalida el historial, para que la marca «Revisada» de la lista se actualice
export const useSessionReview = (athleteId: string, sessionId: string) => {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: (input: SessionReviewInput) =>
      putSessionReview(athleteId, sessionId, input),
    onSuccess: (session: TrainingSession) => {
      queryClient.setQueryData(
        trainingSessionKey(user?.id, athleteId, sessionId),
        session,
      )
      void queryClient.invalidateQueries({
        queryKey: trainingHistoryKey(user?.id, athleteId),
      })
    },
  })
}
