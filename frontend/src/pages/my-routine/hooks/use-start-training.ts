import { useState } from 'react'
import { isApiError } from '../../../lib/api'
import { useNavigate } from '../../../lib/navigation'
import { useStartTrainingSession } from '../../../lib/training-sessions'
import { trainingPath } from '../../../router/paths'

const isConflict = (error: unknown) => isApiError(error) && error.status === 409

// iniciar el entrenamiento de un día: con éxito navega a la pantalla del entrenamiento. Un 409
// (ya hay uno en curso, iniciado en otra pestaña u otro dispositivo) no se muestra como error:
// la mutación ya volvió a pedir la sesión en progreso y la página ofrece retomarla (`conflict`).
// Los demás errores quedan en la mutación y los muestra el panel del día con el que se intentó
export const useStartTraining = (athleteId: string) => {
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

  // estado del botón de un día: mientras se inicia uno no se puede iniciar otro, y el error es
  // el del último intento con ese mismo día (el día elegido no se pierde al fallar)
  const dayState = (routineDayId: string) => {
    const isThisDay = mutation.variables?.routineDayId === routineDayId
    const { error } = mutation
    return {
      isStarting: mutation.isPending && isThisDay,
      disabled: mutation.isPending,
      error: isThisDay && error && !isConflict(error) ? error : null,
    }
  }

  return { start, conflict, dayState }
}
