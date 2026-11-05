import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { ExerciseInput } from '../../../lib/exercises'
import { updateExercise } from '../actions/update-exercise'

// cambia nombre, grupo y descripción que muestra el catálogo: se invalida todo ['exercises']
export const useUpdateExercise = (id: string) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: ExerciseInput) => updateExercise(id, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['exercises'] }),
  })
}
