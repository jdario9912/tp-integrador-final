import { useAuth, useCurrentUser } from '../../../lib/auth'

// nombre desde GET /auth/me; mientras carga se usa el de la sesión guardada
export const useFirstName = () => {
  const { user } = useAuth()
  const { data: currentUser } = useCurrentUser()
  return currentUser?.firstName ?? user?.firstName
}
