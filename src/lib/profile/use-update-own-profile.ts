import { useMutation, useQueryClient } from '@tanstack/react-query'
import { getSession, saveSession, useAuth } from '../auth'
import { updateOwnProfile } from './update-own-profile'
import type { UpdateOwnProfileInput } from './types'
import { ownProfileKey } from './keys'

// al guardar, el perfil queda en caché con la respuesta y la sesión guardada toma el nombre y el
// email nuevos: el menú y el saludo se actualizan sin pedir nada más
export const useUpdateOwnProfile = () => {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  return useMutation({
    // solo la entrada: TanStack pasa además el contexto de la mutación
    mutationFn: (input: UpdateOwnProfileInput) => updateOwnProfile(input),
    onSuccess: (profile) => {
      queryClient.setQueryData(ownProfileKey(user?.id), profile)
      const session = getSession()
      if (session) {
        saveSession({
          ...session,
          user: {
            ...session.user,
            firstName: profile.firstName,
            lastName: profile.lastName,
            email: profile.email,
          },
        })
      }
      void queryClient.invalidateQueries({ queryKey: ['auth', 'me'] })
    },
  })
}
