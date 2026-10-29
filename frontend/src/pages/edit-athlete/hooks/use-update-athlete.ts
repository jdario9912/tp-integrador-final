import { useMutation, useQueryClient } from '@tanstack/react-query'
import { updateAthlete } from '../actions/update-athlete'
import type { UpdateAthleteInput } from '../types'

// cambia nombre, objetivo y peso que muestra "Mis atletas": se invalida todo ['athletes']
export const useUpdateAthlete = (id: string) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: UpdateAthleteInput) => updateAthlete(id, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['athletes'] }),
  })
}
