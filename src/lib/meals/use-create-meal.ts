import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../auth'
import { createMeal } from './create-meal'
import { athleteMealsKey } from './meal-keys'
import type { MealInput } from './types'

// la promesa termina cuando las comidas ya se volvieron a pedir
export const useCreateMeal = (athleteId: string) => {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  return useMutation({
    mutationFn: (input: MealInput) => createMeal(athleteId, input),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: athleteMealsKey(user?.id, athleteId),
      }),
  })
}
