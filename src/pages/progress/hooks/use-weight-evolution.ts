import { useInfiniteQuery } from '@tanstack/react-query'
import { useEffect, useMemo } from 'react'
import { useAuth } from '../../../lib/auth'
import { athleteWeightsKey, getWeights } from '../../../lib/weights'
import { toChartPoints } from '../weight-chart-scale'
import type { WeightRange } from '../weight-range'

// máximo que admite el contrato (8.6): el gráfico pide todas las páginas del rango de a 100
export const EVOLUTION_PAGE_SIZE = 100

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

  const query = useInfiniteQuery({
    queryKey: weightEvolutionKey(user?.id, athleteId, activeRange),
    queryFn: ({ pageParam }) =>
      getWeights(athleteId, {
        from: activeRange.from,
        to: activeRange.to,
        page: pageParam,
        size: EVOLUTION_PAGE_SIZE,
      }),
    initialPageParam: 0,
    getNextPageParam: (lastPage) =>
      lastPage.page + 1 < lastPage.totalPages ? lastPage.page + 1 : undefined,
    enabled: range !== null && user !== null && athleteId !== '',
  })

  const {
    hasNextPage,
    isFetchingNextPage,
    isFetchNextPageError,
    fetchNextPage,
  } = query

  // trae las páginas que faltan, una tras otra. Si una falla, se detiene: no hay reintento en bucle
  useEffect(() => {
    if (hasNextPage && !isFetchingNextPage && !isFetchNextPageError) {
      void fetchNextPage()
    }
  }, [hasNextPage, isFetchingNextPage, isFetchNextPageError, fetchNextPage])

  const points = useMemo(
    () =>
      query.data
        ? toChartPoints(query.data.pages.flatMap((page) => page.content))
        : undefined,
    [query.data],
  )

  return {
    points,
    // hasta que llegan todas las páginas el gráfico no muestra datos parciales
    isPending:
      query.isPending || (hasNextPage === true && !isFetchNextPageError),
    error: query.error,
    refetch: query.refetch,
  }
}
