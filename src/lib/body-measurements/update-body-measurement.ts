import { put } from '../api'
import type { BodyMeasurementRecord, BodyMeasurementRecordInput } from './types'

// edición completa: reemplaza los valores; 409 si la fecha nueva ya tiene otro registro
export const updateBodyMeasurement = (
  athleteId: string,
  recordId: string,
  input: BodyMeasurementRecordInput,
) =>
  put<BodyMeasurementRecord, BodyMeasurementRecordInput>(
    `/athletes/${athleteId}/measurements/${recordId}`,
    input,
  )
