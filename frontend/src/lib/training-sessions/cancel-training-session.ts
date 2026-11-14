import { post } from '../api'
import type { TrainingSession } from './types'

// cancela la sesión en curso (US-20). Sin body. Solo el atleta dueño. La sesión queda CANCELLED
// con su hora de fin, sin borrar lo registrado.
// 200 con la sesión CANCELLED (endedAt y summary); 409 si ya no está en curso
export const cancelTrainingSession = (athleteId: string, sessionId: string) =>
  post<TrainingSession, undefined>(
    `/athletes/${athleteId}/sessions/${sessionId}/cancel`,
    undefined,
  )
