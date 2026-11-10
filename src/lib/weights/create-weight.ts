import { post } from '../api'
import type { WeightRecord, WeightRecordInput } from './types'

// 409 si el atleta ya tiene un registro en esa fecha (contrato de API, 8.7)
export const createWeight = (athleteId: string, input: WeightRecordInput) =>
  post<WeightRecord, WeightRecordInput>(`/athletes/${athleteId}/weights`, input)
