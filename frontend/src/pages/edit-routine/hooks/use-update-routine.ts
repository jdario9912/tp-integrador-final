import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { RoutineInput } from '../../../lib/routines'
import { updateRoutine } from '../actions/update-routine'

// cambia nombre, objetivo y frecuencia que muestra "Mis rutinas": se invalida todo ['routines']
export const useUpdateRoutine = (id: string) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: RoutineInput) => updateRoutine(id, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['routines'] }),
  })
}
