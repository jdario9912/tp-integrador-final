import { useMemo } from 'react'
import { useAuth } from '../../../lib/auth'
import {
  athleteBodyMeasurementsKey,
  getBodyMeasurements,
} from '../../../lib/body-measurements'
import type { MeasurementField } from '../body-measurement-fields'
import { measurementPoints } from '../body-measurement-evolution'
import type { WeightRange } from '../weight-range'
import { useAllPages } from './use-all-pages'
import type { BodyMeasurementRecord } from '../../../lib/body-measurements'

// US-45 (F3): los valores de una medida en el rango (US-29). Se pagan todos los registros del
// rango una vez y el selector elige la medida sin volver a pedir. range o field null = no se pide
export const useBodyMeasurementEvolution = (
  athleteId: string,
  range: WeightRange | null,
  field: MeasurementField | null,
) => {
  const { user } = useAuth()
  const activeRange = range ?? {}

  const { records, isPending, error, refetch } =
    useAllPages<BodyMeasurementRecord>({
      queryKey: [
        ...athleteBodyMeasurementsKey(user?.id, athleteId),
        'evolution',
        activeRange.from ?? null,
        activeRange.to ?? null,
      ],
      fetchPage: (page, size) =>
        getBodyMeasurements(athleteId, {
          from: activeRange.from,
          to: activeRange.to,
          page,
          size,
        }),
      enabled:
        range !== null && field !== null && user !== null && athleteId !== '',
    })

  const points = useMemo(
    () =>
      records && field ? measurementPoints(records, field.key) : undefined,
    [records, field],
  )

  return { points, isPending, error, refetch }
}
