import { useMutation, useQueryClient } from '@tanstack/react-query'
import { unlinkAthlete } from '../actions/unlink-athlete'

// sin refetch: el detalle abierto respondería 403 (ya no es del entrenador) antes de salir de la
// página. Queda marcado como viejo y el listado se vuelve a pedir al montarse
export const useUnlinkAthlete = (id: string) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => unlinkAthlete(id),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: ['athletes'],
        refetchType: 'none',
      }),
  })
}
