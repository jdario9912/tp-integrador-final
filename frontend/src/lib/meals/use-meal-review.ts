import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../auth'
import { athleteMealsKey } from './meal-keys'
import { putMealReview } from './put-meal-review'
import type { MealReviewInput } from './types'

export type MealReviewVariables = { mealId: string; input: MealReviewInput }

// marcar revisada (o editar la revisión de) una comida (US-25). Invalida las comidas del atleta: la
// lista del día, su resumen y la alimentación por rango cuelgan de esa clave, así se actualiza la
// marca «Revisada» de la comida
export const useMealReview = (athleteId: string) => {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  return useMutation({
    mutationFn: ({ mealId, input }: MealReviewVariables) =>
      putMealReview(athleteId, mealId, input),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: athleteMealsKey(user?.id, athleteId),
      }),
  })
}
