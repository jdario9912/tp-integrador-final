import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../auth'
import { getAlerts } from './get-alerts'

// el id del usuario va en la clave: si cambia la sesión no se muestran las alertas del anterior
export const alertsKey = (userId: string | undefined) =>
  ['alerts', userId] as const

// sin staleTime, como el panel: las alertas las genera el backend y se vuelven a pedir cada vez
// que se abre. Solo para entrenadores
export const useAlerts = () => {
  const { user } = useAuth()
  return useQuery({
    queryKey: alertsKey(user?.id),
    queryFn: getAlerts,
    enabled: user?.role === 'COACH',
  })
}
