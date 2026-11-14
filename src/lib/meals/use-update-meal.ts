import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../auth'
import { isApiError } from '../api'
import { athleteMealsKey } from './meal-keys'
import { updateMeal } from './update-meal'
import type { MealInput } from './types'

export type UpdateMealVariables = { mealId: string; input: MealInput }

// los ítems cambian de id en cada edición: se vuelve a pedir el día en vez de reusar la respuesta.
// Un 404 (la comida la borraron en otro lado) también refresca la lista
export const useUpdateMeal = (athleteId: string) => {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const refresh = () =>
    queryClient.invalidateQueries({
      queryKey: athleteMealsKey(user?.id, athleteId),
    })
  return useMutation({
    mutationFn: ({ mealId, input }: UpdateMealVariables) =>
      updateMeal(athleteId, mealId, input),
    onSuccess: refresh,
    onError: (error) => {
      if (isApiError(error) && error.status === 404) return refresh()
    },
  })
}
