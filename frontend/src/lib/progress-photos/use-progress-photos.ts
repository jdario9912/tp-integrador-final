import { useInfiniteQuery } from '@tanstack/react-query'
import { useAuth } from '../auth'
import { getProgressPhotos } from './get-progress-photos'
import { progressPhotoListKey } from './keys'

export const PROGRESS_PHOTOS_PAGE_SIZE = 20

// listado cronológico paginado: "Cargar más" pide la página siguiente
export const useProgressPhotos = (athleteId: string) => {
  const { user } = useAuth()
  return useInfiniteQuery({
    queryKey: progressPhotoListKey(
      user?.id,
      athleteId,
      PROGRESS_PHOTOS_PAGE_SIZE,
    ),
    queryFn: ({ pageParam }) =>
      getProgressPhotos(athleteId, {
        page: pageParam,
        size: PROGRESS_PHOTOS_PAGE_SIZE,
      }),
    initialPageParam: 0,
    getNextPageParam: (lastPage) =>
      lastPage.page + 1 < lastPage.totalPages ? lastPage.page + 1 : undefined,
    enabled: user !== null && athleteId !== '',
  })
}
