import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../auth'
import { progressPhotoListsKey } from './keys'
import type { ProgressPhotoUploadInput } from './types'
import { uploadProgressPhoto } from './upload-progress-photo'

// al subir, el listado se vuelve a pedir: la foto nueva va en su lugar cronológico
export const useUploadProgressPhoto = (athleteId: string) => {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  return useMutation({
    mutationFn: (input: ProgressPhotoUploadInput) =>
      uploadProgressPhoto(athleteId, input),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: progressPhotoListsKey(user?.id, athleteId),
      }),
  })
}
