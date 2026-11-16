import { get, type PageResponse } from '../api'
import type { TrainingHistoryItem, TrainingHistoryQuery } from './types'

// historial de sesiones cerradas del atleta, paginado (contrato 25). Un from o to vacío no se
// manda (axios omite los undefined): sin fechas no hay límite. 400 si la fecha no tiene formato
// YYYY-MM-DD o from es posterior a to
export const getTrainingHistory = (
  athleteId: string,
  query: TrainingHistoryQuery = {},
) =>
  get<PageResponse<TrainingHistoryItem>>(`/athletes/${athleteId}/sessions`, {
    params: query,
  })
