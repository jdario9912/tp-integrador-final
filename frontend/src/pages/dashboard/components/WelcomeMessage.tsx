import { useAuth, useCurrentUser } from '../../../lib/auth'

// nombre desde GET /auth/me; mientras carga se usa el de la sesión guardada
export function WelcomeMessage() {
  const { user } = useAuth()
  const { data: currentUser } = useCurrentUser()
  const firstName = currentUser?.firstName ?? user?.firstName

  return <p>Hola, {firstName}</p>
}
