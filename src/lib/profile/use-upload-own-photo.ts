import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../auth'
import { ownProfileKey } from './keys'
import { uploadOwnPhoto } from './upload-own-photo'

// la respuesta trae el perfil con la foto nueva y su URL firmada: no hace falta volver a pedirlo
export const useUploadOwnPhoto = () => {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  return useMutation({
    // solo el archivo: TanStack pasa además el contexto de la mutación
    mutationFn: (file: File) => uploadOwnPhoto(file),
    onSuccess: (profile) => {
      queryClient.setQueryData(ownProfileKey(user?.id), profile)
    },
  })
}
