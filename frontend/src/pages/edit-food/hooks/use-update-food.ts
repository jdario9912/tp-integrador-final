import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { FoodInput } from '../../../lib/foods'
import { updateFood } from '../actions/update-food'

// cambia lo que muestra el catálogo: se invalida todo ['foods']
export const useUpdateFood = (id: string) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: FoodInput) => updateFood(id, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['foods'] }),
  })
}
