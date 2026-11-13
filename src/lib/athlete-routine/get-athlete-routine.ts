import { getOptional } from '../api'
import type { AthleteRoutine } from './types'

// 204 = el atleta no tiene una rutina activa: devuelve null, no es un error (contrato 9.4).
// 403 si no puede ver a ese atleta, 404 si no existe
export const getAthleteRoutine = (athleteId: string) =>
  getOptional<AthleteRoutine>(`/athletes/${athleteId}/routine`)
