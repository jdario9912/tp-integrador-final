import { get, type PageResponse } from '../api'
import type { WeightRecord, WeightsQuery } from './types'

// axios omite los params en undefined: sin from/to no hay límite de fechas
export const getWeights = (athleteId: string, query: WeightsQuery = {}) =>
  get<PageResponse<WeightRecord>>(`/athletes/${athleteId}/weights`, {
    params: query,
  })
