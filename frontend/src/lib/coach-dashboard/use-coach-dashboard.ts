import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../auth'
import { getCoachDashboard } from './get-coach-dashboard'

// el id del usuario va en la clave: si cambia la sesión no se muestra la cartera del anterior
export const coachDashboardKey = (userId: string | undefined) =>
  ['coach-dashboard', userId] as const

// estado de la cartera del entrenador de la sesión (US-11). Sin staleTime: cada vez que se abre el
// panel se vuelve a pedir, porque altas, asignaciones, revisiones y pesos cambian en otras pantallas
export const useCoachDashboard = () => {
  const { user } = useAuth()
  return useQuery({
    queryKey: coachDashboardKey(user?.id),
    queryFn: getCoachDashboard,
    enabled: user !== null,
  })
}
