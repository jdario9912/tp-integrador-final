import { useMutation, useQueryClient } from '@tanstack/react-query'
import { isApiError } from '../api'
import { useAuth } from '../auth'
import { deleteMeal } from './delete-meal'
import { athleteMealsKey } from './meal-keys'

// un 404 (ya no existe) también refresca: la comida ya no debería aparecer en la lista
export const useDeleteMeal = (athleteId: string) => {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const refresh = () =>
    queryClient.invalidateQueries({
      queryKey: athleteMealsKey(user?.id, athleteId),
    })
  return useMutation({
    mutationFn: (mealId: string) => deleteMeal(athleteId, mealId),
    onSuccess: refresh,
    onError: (error) => {
      if (isApiError(error) && error.status === 404) return refresh()
    },
  })
}
