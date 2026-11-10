import { useState } from 'react'
import { isApiError } from '../api'
import type { RoutineAssignment } from './types'
import { useAssignRoutine } from './use-assign-routine'

// asignación que espera la confirmación del entrenador para reemplazar la activa
export type PendingReplace = {
  athleteId: string
  routineId: string
  // mensaje del 409: nombra la rutina activa
  message: string
}

type AssignRoutineFlowOptions = {
  onAssigned?: (assignment: RoutineAssignment, athleteId: string) => void
}

// siempre pide primero sin replaceActive: el servidor decide si hay que reemplazar. Ante el 409
// queda pendiente hasta que se confirme (reenvía con replaceActive) o se cancele. El resto de
// los errores (403, 404, 422, 5xx) queda en error para mostrarlo
export const useAssignRoutineFlow = ({
  onAssigned,
}: AssignRoutineFlowOptions = {}) => {
  const mutation = useAssignRoutine()
  const [pendingReplace, setPendingReplace] = useState<PendingReplace>()

  const send = async (
    athleteId: string,
    routineId: string,
    replaceActive: boolean,
  ) => {
    try {
      const assignment = await mutation.mutateAsync({
        athleteId,
        input: { routineId, replaceActive },
      })
      onAssigned?.(assignment, athleteId)
    } catch (error) {
      if (!replaceActive && isApiError(error) && error.status === 409) {
        setPendingReplace({ athleteId, routineId, message: error.message })
      }
    }
  }

  const assign = (athleteId: string, routineId: string) => {
    setPendingReplace(undefined)
    return send(athleteId, routineId, false)
  }

  // el diálogo se cierra cuando termina, salga bien o mal: el error queda en error
  const confirm = async () => {
    if (!pendingReplace) return
    await send(pendingReplace.athleteId, pendingReplace.routineId, true)
    setPendingReplace(undefined)
  }

  const cancel = () => {
    setPendingReplace(undefined)
    mutation.reset()
  }

  return {
    assign,
    confirm,
    cancel,
    // descarta el error, por ejemplo al cerrar el formulario
    reset: cancel,
    pendingReplace,
    isPending: mutation.isPending,
    // el 409 no es un error para mostrar: es el pedido de confirmación
    error: pendingReplace ? null : mutation.error,
  }
}
