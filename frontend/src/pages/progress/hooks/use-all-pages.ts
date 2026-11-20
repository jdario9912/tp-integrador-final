import { useInfiniteQuery, type QueryKey } from '@tanstack/react-query'
import { useEffect, useMemo } from 'react'
import type { PageResponse } from '../../../lib/api'

// máximo que admite el contrato (8.6): el gráfico pide todas las páginas del rango de a 100
export const EVOLUTION_PAGE_SIZE = 100

type UseAllPagesOptions<T> = {
  queryKey: QueryKey
  // trae una página del listado; el size ya viene fijado
  fetchPage: (page: number, size: number) => Promise<PageResponse<T>>
  enabled: boolean
}

// US-29 y US-45: trae todas las páginas de un listado, una tras otra, y las entrega juntas.
// Hasta que llegan todas no se entregan datos parciales. Si una página falla, se detiene:
// no hay reintento en bucle
export const useAllPages = <T>({
  queryKey,
  fetchPage,
  enabled,
}: UseAllPagesOptions<T>) => {
  const query = useInfiniteQuery({
    queryKey,
    queryFn: ({ pageParam }) => fetchPage(pageParam, EVOLUTION_PAGE_SIZE),
    initialPageParam: 0,
    getNextPageParam: (lastPage) =>
      lastPage.page + 1 < lastPage.totalPages ? lastPage.page + 1 : undefined,
    enabled,
  })

  const {
    hasNextPage,
    isFetchingNextPage,
    isFetchNextPageError,
    fetchNextPage,
  } = query

  useEffect(() => {
    if (hasNextPage && !isFetchingNextPage && !isFetchNextPageError) {
      void fetchNextPage()
    }
  }, [hasNextPage, isFetchingNextPage, isFetchNextPageError, fetchNextPage])

  const records = useMemo(
    () =>
      query.data ? query.data.pages.flatMap((page) => page.content) : undefined,
    [query.data],
  )

  return {
    records,
    isPending:
      query.isPending || (hasNextPage === true && !isFetchNextPageError),
    error: query.error,
    refetch: query.refetch,
  }
}
