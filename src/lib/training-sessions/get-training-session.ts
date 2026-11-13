import { get } from '../api'
import type { TrainingSession } from './types'

// 404 si la sesión no existe o es de otro atleta; 403 si no puede ver a ese atleta (contrato 10.5)
export const getTrainingSession = (athleteId: string, sessionId: string) =>
  get<TrainingSession>(`/athletes/${athleteId}/sessions/${sessionId}`)
