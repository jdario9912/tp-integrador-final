import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createAthlete } from '../actions/create-athlete'

// el alta cambia "Mis atletas": se invalida para que el listado no muestre datos viejos
export const useCreateAthlete = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: createAthlete,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['athletes'] }),
  })
}
