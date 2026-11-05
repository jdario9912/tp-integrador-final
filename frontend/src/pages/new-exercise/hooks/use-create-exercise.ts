import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createExercise } from '../actions/create-exercise'

// el alta cambia el catálogo: se invalida para que el listado no muestre datos viejos
export const useCreateExercise = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: createExercise,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['exercises'] }),
  })
}
