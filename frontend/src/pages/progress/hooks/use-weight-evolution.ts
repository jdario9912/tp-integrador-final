import { useMemo } from 'react'
import { useAuth } from '../../../lib/auth'
import {
  athleteWeightsKey,
  getWeights,
  type WeightRecord,
} from '../../../lib/weights'
import { toChartPoints } from '../weight-chart-scale'
import type { WeightRange } from '../weight-range'
import { useAllPages } from './use-all-pages'

// la clave cuelga de la de los pesos: alta y edición la invalidan junto con el resto (US-26)
export const weightEvolutionKey = (
  userId: string | undefined,
  athleteId: string,
  range: WeightRange,
) =>
  [
    ...athleteWeightsKey(userId, athleteId),
    'evolution',
    range.from ?? null,
    range.to ?? null,
  ] as const

// todos los registros del rango, ordenados de la más antigua a la más nueva para el gráfico.
// range null = rango inválido: no se pide nada (lo explica la tarjeta)
export const useWeightEvolution = (
  athleteId: string,
  range: WeightRange | null,
) => {
  const { user } = useAuth()
  const activeRange = range ?? {}

  const { records, isPending, error, refetch } = useAllPages<WeightRecord>({
    queryKey: weightEvolutionKey(user?.id, athleteId, activeRange),
    fetchPage: (page, size) =>
      getWeights(athleteId, {
        from: activeRange.from,
        to: activeRange.to,
        page,
        size,
      }),
    enabled: range !== null && user !== null && athleteId !== '',
  })

  const points = useMemo(
    () => (records ? toChartPoints(records) : undefined),
    [records],
  )

  return { points, isPending, error, refetch }
}
