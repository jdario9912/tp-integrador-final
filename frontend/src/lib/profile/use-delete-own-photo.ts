import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../auth'
import { deleteOwnPhoto } from './delete-own-photo'
import { ownProfileKey } from './keys'
import type { OwnProfile } from './types'

// 204 (también si no había foto): el perfil en caché queda sin foto
export const useDeleteOwnPhoto = () => {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  return useMutation({
    mutationFn: deleteOwnPhoto,
    onSuccess: () => {
      queryClient.setQueryData<OwnProfile>(
        ownProfileKey(user?.id),
        (profile) =>
          profile
            ? { ...profile, photoUrl: null, photoUrlExpiresAt: null }
            : profile,
      )
    },
  })
}
