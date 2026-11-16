import { put } from '../api'
import type { SessionReviewInput, TrainingSession } from './types'

// solo el entrenador del atleta (US-21). Revisar reemplaza la observación anterior. 200 con la
// sesión completa (con review); 422 si la sesión no está finalizada; 400 si la observación supera
// 1000 caracteres
export const putSessionReview = (
  athleteId: string,
  sessionId: string,
  input: SessionReviewInput,
) =>
  put<TrainingSession, SessionReviewInput>(
    `/athletes/${athleteId}/sessions/${sessionId}/review`,
    input,
  )
