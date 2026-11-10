import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { RoutineStructureInput } from '../../../lib/routines'
import { saveRoutineStructure } from '../actions/save-routine-structure'

// el detalle cuelga de ['routines']: se invalida para que muestre la estructura guardada
export const useSaveRoutineStructure = (id: string) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: RoutineStructureInput) =>
      saveRoutineStructure(id, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['routines'] }),
  })
}
