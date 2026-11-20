import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../auth'
import { createBodyMeasurement } from './create-body-measurement'
import type { BodyMeasurementRecordInput } from './types'
import { athleteBodyMeasurementsKey } from './use-body-measurements'

// devuelve la promesa del invalidate: la mutación termina cuando la lista ya se actualizó
export const useCreateBodyMeasurement = (athleteId: string) => {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  return useMutation({
    mutationFn: (input: BodyMeasurementRecordInput) =>
      createBodyMeasurement(athleteId, input),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: athleteBodyMeasurementsKey(user?.id, athleteId),
      }),
  })
}
