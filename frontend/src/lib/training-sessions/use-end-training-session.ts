import { useMutation, useQueryClient } from '@tanstack/react-query'
import { isApiError } from '../api'
import { useAuth } from '../auth'
import { cancelTrainingSession } from './cancel-training-session'
import { finishTrainingSession } from './finish-training-session'
import {
  inProgressSessionKey,
  trainingSessionKey,
} from './training-session-keys'
import { storeEndedSession } from './store-ended-session'
import type { TrainingSession } from './types'

// finalizar y cancelar (US-20). Comparten la scope de las series de la sesión: así una
// finalización espera a que termine de guardarse una serie en curso y no llega antes que ella.
// Como en las series, no se reintentan solas: el atleta decide volver a tocar el botón
const useEndSession = (
  athleteId: string,
  sessionId: string,
  end: (athleteId: string, sessionId: string) => Promise<TrainingSession>,
) => {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    scope: { id: `performed-sets-${sessionId}` },
    mutationFn: () => end(athleteId, sessionId),
    onSuccess: (session) => {
      storeEndedSession(queryClient, user?.id, athleteId, session)
    },
    // 409: la sesión ya no está en curso (se finalizó o canceló en otro lado). Se vuelve a pedir
    // para que la pantalla muestre su estado real
    onError: async (error) => {
      if (isApiError(error) && error.status === 409) {
        await Promise.all([
          queryClient.invalidateQueries({
            queryKey: trainingSessionKey(user?.id, athleteId, sessionId),
          }),
          queryClient.invalidateQueries({
            queryKey: inProgressSessionKey(user?.id, athleteId),
          }),
        ])
      }
    },
  })
}

// finaliza la sesión: la respuesta reemplaza el detalle y, si era la que estaba en progreso, la
// saca de «en progreso» (la pantalla pasa al resumen)
export const useFinishTrainingSession = (
  athleteId: string,
  sessionId: string,
) => useEndSession(athleteId, sessionId, finishTrainingSession)

// cancela la sesión: mismo efecto en la caché que finalizar, con el estado CANCELLED
export const useCancelTrainingSession = (
  athleteId: string,
  sessionId: string,
) => useEndSession(athleteId, sessionId, cancelTrainingSession)
