import { post } from '../api'
import type { BodyMeasurementRecord, BodyMeasurementRecordInput } from './types'

// 409 si el atleta ya tiene un registro de medidas en esa fecha (como el peso, D-028)
export const createBodyMeasurement = (
  athleteId: string,
  input: BodyMeasurementRecordInput,
) =>
  post<BodyMeasurementRecord, BodyMeasurementRecordInput>(
    `/athletes/${athleteId}/measurements`,
    input,
  )
