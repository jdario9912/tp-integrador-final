import { put } from '../api'
import type { WeightRecord, WeightRecordInput } from './types'

// edición completa; 409 si la fecha nueva ya la tiene otro registro del atleta (8.7)
export const updateWeight = (
  athleteId: string,
  weightId: string,
  input: WeightRecordInput,
) =>
  put<WeightRecord, WeightRecordInput>(
    `/athletes/${athleteId}/weights/${weightId}`,
    input,
  )
