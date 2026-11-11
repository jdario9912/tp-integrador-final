import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createFood } from '../actions/create-food'

// el alta cambia el catálogo: se invalida para que el listado no muestre datos viejos
export const useCreateFood = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: createFood,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['foods'] }),
  })
}
