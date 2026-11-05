import { useMutation, useQueryClient } from '@tanstack/react-query'
import { deleteExercise } from '../actions/delete-exercise'

// sin refetch: el detalle abierto respondería 404 antes de salir de la página. Queda marcado
// como viejo y el listado se vuelve a pedir al montarse
export const useDeleteExercise = (id: string) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => deleteExercise(id),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: ['exercises'],
        refetchType: 'none',
      }),
  })
}
