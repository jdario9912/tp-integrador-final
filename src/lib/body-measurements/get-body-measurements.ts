import { get, type PageResponse } from '../api'
import type { BodyMeasurementRecord, BodyMeasurementsQuery } from './types'

// axios omite los params en undefined: sin from/to no hay límite de fechas
export const getBodyMeasurements = (
  athleteId: string,
  query: BodyMeasurementsQuery = {},
) =>
  get<PageResponse<BodyMeasurementRecord>>(
    `/athletes/${athleteId}/measurements`,
    { params: query },
  )
