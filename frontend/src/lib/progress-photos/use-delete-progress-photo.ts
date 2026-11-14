import {
  useMutation,
  useQueryClient,
  type InfiniteData,
  type QueryClient,
} from '@tanstack/react-query'
import { isApiError } from '../api'
import type { PageResponse } from '../api'
import { useAuth } from '../auth'
import { deleteProgressPhoto } from './delete-progress-photo'
import { progressPhotoListsKey } from './keys'
import type { ProgressPhoto } from './types'

type PhotosData = InfiniteData<PageResponse<ProgressPhoto>>

// quita la foto de todos los listados en caché, sin volver a pedirlos (contrato, 14)
const removeFromLists = (
  queryClient: QueryClient,
  listsKey: readonly unknown[],
  photoId: string,
) =>
  queryClient.setQueriesData<PhotosData>({ queryKey: listsKey }, (data) => {
    if (!data) return data
    return {
      ...data,
      pages: data.pages.map((page) => {
        const content = page.content.filter(({ id }) => id !== photoId)
        const removed = page.content.length - content.length
        return {
          ...page,
          content,
          totalElements: Math.max(0, page.totalElements - removed),
        }
      }),
    }
  })

// 204: la foto sale de la lista. 404: ya no existe, también sale (contrato, 14)
export const useDeleteProgressPhoto = (athleteId: string) => {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const listsKey = progressPhotoListsKey(user?.id, athleteId)
  return useMutation({
    mutationFn: (photoId: string) => deleteProgressPhoto(athleteId, photoId),
    onSuccess: (_result, photoId) => {
      removeFromLists(queryClient, listsKey, photoId)
    },
    onError: (error, photoId) => {
      if (isApiError(error) && error.status === 404) {
        removeFromLists(queryClient, listsKey, photoId)
      }
    },
  })
}
