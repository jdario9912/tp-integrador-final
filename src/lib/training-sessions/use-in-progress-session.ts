import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../auth'
import { getInProgressSession } from './get-in-progress-session'
import { inProgressSessionKey } from './training-session-keys'

// data: la sesión en progreso, o null si no hay ninguna (estado de éxito, no de error).
// Sin staleTime: cada vez que se muestra «Mi rutina» se vuelve a preguntar, porque otra pestaña
// u otro dispositivo pudo iniciar una
export const useInProgressSession = (athleteId: string) => {
  const { user } = useAuth()
  return useQuery({
    queryKey: inProgressSessionKey(user?.id, athleteId),
    queryFn: () => getInProgressSession(athleteId),
    enabled: user !== null && athleteId !== '',
  })
}
