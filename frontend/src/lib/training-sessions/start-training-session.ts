import { post } from '../api'
import type { StartTrainingSessionInput, TrainingSession } from './types'

// solo el atleta. 409 si ya tiene una en progreso; 422 sin rutina activa, con la rutina vencida,
// con un día ajeno a la rutina o sin ejercicios, con mensajes para mostrar tal cual (contrato 10.8)
export const startTrainingSession = (
  athleteId: string,
  input: StartTrainingSessionInput,
) =>
  post<TrainingSession, StartTrainingSessionInput>(
    `/athletes/${athleteId}/sessions`,
    input,
  )
