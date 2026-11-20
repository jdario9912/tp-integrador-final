import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../auth'
import type { BodyMeasurementRecordInput } from './types'
import { updateBodyMeasurement } from './update-body-measurement'
import { athleteBodyMeasurementsKey } from './use-body-measurements'

type UpdateBodyMeasurementVariables = {
  recordId: string
  input: BodyMeasurementRecordInput
}

// cambiar la fecha reordena la lista: se invalidan todos los registros del atleta
export const useUpdateBodyMeasurement = (athleteId: string) => {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  return useMutation({
    mutationFn: ({ recordId, input }: UpdateBodyMeasurementVariables) =>
      updateBodyMeasurement(athleteId, recordId, input),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: athleteBodyMeasurementsKey(user?.id, athleteId),
      }),
  })
}
