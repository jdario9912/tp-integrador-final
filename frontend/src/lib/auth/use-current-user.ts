import { useQuery } from '@tanstack/react-query'
import { getCurrentUser } from './get-current-user'
import { useAuth } from './use-auth'

// el id del usuario va en la key: si cambia la sesión no se muestran datos del anterior
export const useCurrentUser = () => {
  const { user } = useAuth()
  return useQuery({
    queryKey: ['auth', 'me', user?.id],
    queryFn: getCurrentUser,
    enabled: user !== null,
  })
}
