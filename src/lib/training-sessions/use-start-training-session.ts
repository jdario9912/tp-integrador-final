import { useMutation, useQueryClient } from '@tanstack/react-query'
import { isApiError } from '../api'
import { useAuth } from '../auth'
import { startTrainingSession } from './start-training-session'
import {
  inProgressSessionKey,
  trainingSessionKey,
} from './training-session-keys'
import type { StartTrainingSessionInput } from './types'

// la sesión creada siembra la caché de la sesión en progreso y la del detalle: la pantalla del
// entrenamiento se muestra sin otra consulta. Ante un 409 (otra pestaña u otro dispositivo ya
// inició una) vuelve a pedir la sesión en progreso para ofrecer retomarla; la mutación termina
// cuando esa consulta ya respondió. El 409 no trae el id de la sesión abierta (contrato 10.8)
export const useStartTrainingSession = (athleteId: string) => {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: (input: StartTrainingSessionInput) =>
      startTrainingSession(athleteId, input),
    onSuccess: (session) => {
      queryClient.setQueryData(
        inProgressSessionKey(user?.id, athleteId),
        session,
      )
      queryClient.setQueryData(
        trainingSessionKey(user?.id, athleteId, session.id),
        session,
      )
    },
    onError: async (error) => {
      if (isApiError(error) && error.status === 409) {
        await queryClient.invalidateQueries({
          queryKey: inProgressSessionKey(user?.id, athleteId),
        })
      }
    },
  })
}
