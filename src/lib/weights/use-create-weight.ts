import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../auth'
import { createWeight } from './create-weight'
import type { WeightRecordInput } from './types'
import { athleteWeightsKey } from './use-weights'

// devuelve la promesa del invalidate: la mutación termina cuando la lista ya se actualizó
export const useCreateWeight = (athleteId: string) => {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  return useMutation({
    mutationFn: (input: WeightRecordInput) => createWeight(athleteId, input),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: athleteWeightsKey(user?.id, athleteId),
      }),
  })
}
