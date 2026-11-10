import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../auth'
import type { WeightRecordInput } from './types'
import { updateWeight } from './update-weight'
import { athleteWeightsKey } from './use-weights'

type UpdateWeightVariables = { weightId: string; input: WeightRecordInput }

// cambiar la fecha reordena la lista: se invalidan todos los registros del atleta
export const useUpdateWeight = (athleteId: string) => {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  return useMutation({
    mutationFn: ({ weightId, input }: UpdateWeightVariables) =>
      updateWeight(athleteId, weightId, input),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: athleteWeightsKey(user?.id, athleteId),
      }),
  })
}
