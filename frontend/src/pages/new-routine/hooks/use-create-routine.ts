import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createRoutine } from '../actions/create-routine'

// el alta cambia "Mis rutinas": se invalida para que el listado no muestre datos viejos
export const useCreateRoutine = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: createRoutine,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['routines'] }),
  })
}
