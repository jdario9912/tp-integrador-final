import { useState } from 'react'
import { isApiError } from '../../../lib/api'
import { useNavigate } from '../../../lib/navigation'
import { useStartTrainingSession } from '../../../lib/training-sessions'
import { trainingPath } from '../../../router/paths'

const isConflict = (error: unknown) => isApiError(error) && error.status === 409

// iniciar el día que toca desde el panel, igual que en «Mi rutina» (US-18). Con éxito va a la
// pantalla del entrenamiento. Un 409 (ya hay uno en curso) no es un error: la mutación ya volvió a
// pedir la sesión en progreso y la tarjeta pasa a ofrecer «Retomar» (`conflict`)
export const useStartTodayTraining = (athleteId: string) => {
  const navigate = useNavigate()
  const mutation = useStartTrainingSession(athleteId)
  const [conflict, setConflict] = useState(false)

  const start = async (routineDayId: string) => {
    setConflict(false)
    try {
      const session = await mutation.mutateAsync({ routineDayId })
      navigate(trainingPath(session.id))
    } catch (error) {
      if (isConflict(error)) setConflict(true)
    }
  }

  const { error } = mutation
  return {
    start,
    conflict,
    isStarting: mutation.isPending,
    // los 422 traen textos para el atleta (rutina vencida, día sin ejercicios): se muestran tal cual
    error: error && !isConflict(error) ? error : null,
  }
}
