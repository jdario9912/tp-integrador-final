import { post } from '../api'
import type { TrainingSession } from './types'

// finaliza la sesión en curso (US-20). Sin body. Solo el atleta dueño. Con cero series hechas el
// backend también finaliza: la confirmación la pide la pantalla, que ofrece cancelar.
// 200 con la sesión FINISHED (endedAt y summary); 409 si ya no está en curso
export const finishTrainingSession = (athleteId: string, sessionId: string) =>
  post<TrainingSession, undefined>(
    `/athletes/${athleteId}/sessions/${sessionId}/finish`,
    undefined,
  )
