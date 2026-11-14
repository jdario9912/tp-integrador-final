import { useMutation, useQueryClient } from '@tanstack/react-query'
import { isApiError } from '../api'
import { useAuth } from '../auth'
import {
  inProgressSessionKey,
  trainingSessionKey,
} from './training-session-keys'
import { putPerformedSet } from './put-performed-set'
import type { PerformedSetInput, TrainingSession } from './types'

export type SavePerformedSetVariables = {
  routineExerciseId: string
  setNumber: number
  body: PerformedSetInput
}

// registra, corrige u omite una serie. La respuesta trae la sesión completa: reemplaza el detalle
// y, si es la misma sesión, la sesión en progreso, sin invalidar (contrato 11.4).
// Las mutaciones de una misma sesión van en serie (scope): así las respuestas llegan en el orden
// en que se hicieron y ninguna pisa a otra en la caché. No se reintenta sola (mutations.retry es
// false): el reintento lo decide el atleta, con el mismo cuerpo, y el PUT no duplica
export const usePutPerformedSet = (athleteId: string, sessionId: string) => {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const inProgressKey = inProgressSessionKey(user?.id, athleteId)
  const detailKey = trainingSessionKey(user?.id, athleteId, sessionId)

  return useMutation({
    scope: { id: `performed-sets-${sessionId}` },
    mutationFn: ({
      routineExerciseId,
      setNumber,
      body,
    }: SavePerformedSetVariables) =>
      putPerformedSet(
        { athleteId, sessionId, routineExerciseId, setNumber },
        body,
      ),
    onSuccess: (session) => {
      queryClient.setQueryData(detailKey, session)
      if (
        queryClient.getQueryData<TrainingSession | null>(inProgressKey)?.id ===
        session.id
      ) {
        queryClient.setQueryData(inProgressKey, session)
      }
    },
    // 409: la sesión ya no está en curso (se finalizó o canceló en otro lado). Se vuelve a pedir
    // para que la pantalla muestre su estado real y no ofrezca cargar más series
    onError: async (error) => {
      if (isApiError(error) && error.status === 409) {
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: detailKey }),
          queryClient.invalidateQueries({ queryKey: inProgressKey }),
        ])
      }
    },
  })
}
