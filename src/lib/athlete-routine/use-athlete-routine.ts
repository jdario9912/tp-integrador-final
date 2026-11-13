import { useQuery } from '@tanstack/react-query'
import { athleteAssignmentsKey } from '../assignments'
import { useAuth } from '../auth'
import { getAthleteRoutine } from './get-athlete-routine'

// cuelga de las asignaciones del atleta: al asignarle otra rutina (US-16) se invalida junto con
// el historial. El id del usuario va en la clave: si cambia la sesión no se muestran datos del anterior
export const athleteRoutineKey = (
  userId: string | undefined,
  athleteId: string,
) => [...athleteAssignmentsKey(userId, athleteId), 'routine']

// data: la rutina activa, o null si el atleta no tiene una (estado de éxito, no de error)
export const useAthleteRoutine = (athleteId: string) => {
  const { user } = useAuth()
  return useQuery({
    queryKey: athleteRoutineKey(user?.id, athleteId),
    queryFn: () => getAthleteRoutine(athleteId),
    enabled: user !== null && athleteId !== '',
  })
}
