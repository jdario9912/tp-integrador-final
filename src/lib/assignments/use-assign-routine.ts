import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../auth'
import { assignRoutine } from './assign-routine'
import type { AssignRoutineInput } from './types'
import { athleteAssignmentsKey } from './use-assignments'

export type AssignRoutineVariables = {
  athleteId: string
  input: AssignRoutineInput
}

// devuelve la promesa del invalidate: la mutación termina con la rutina activa ya actualizada.
// No invalida ['athletes']: el estado del atleta no cambia al asignar
export const useAssignRoutine = () => {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  return useMutation({
    mutationFn: ({ athleteId, input }: AssignRoutineVariables) =>
      assignRoutine(athleteId, input),
    onSuccess: (_assignment, { athleteId }) =>
      queryClient.invalidateQueries({
        queryKey: athleteAssignmentsKey(user?.id, athleteId),
      }),
  })
}
