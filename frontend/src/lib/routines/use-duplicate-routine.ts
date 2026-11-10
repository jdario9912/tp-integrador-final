import { useMutation, useQueryClient } from '@tanstack/react-query'
import { duplicateRoutine } from './duplicate-routine'

// la copia aparece en "Mis rutinas". La usan el detalle y la estructura (ante un 422)
export const useDuplicateRoutine = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: duplicateRoutine,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['routines'] }),
  })
}
