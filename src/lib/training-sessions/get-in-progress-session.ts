import { getOptional } from '../api'
import type { TrainingSession } from './types'

// 204 = el atleta no tiene una sesión en progreso: devuelve null, no es un error (contrato 10.4)
export const getInProgressSession = (athleteId: string) =>
  getOptional<TrainingSession>(`/athletes/${athleteId}/sessions/in-progress`)
