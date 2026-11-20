import {
  useBodyMeasurements,
  type BodyMeasurementsQuery,
} from '../../../lib/body-measurements'

// US-45: las 10 más recientes, por fecha descendente (contrato 17.9)
export const LATEST_BODY_MEASUREMENTS_QUERY = {
  size: 10,
} satisfies BodyMeasurementsQuery

export const useLatestBodyMeasurements = (athleteId: string) =>
  useBodyMeasurements(athleteId, LATEST_BODY_MEASUREMENTS_QUERY)
