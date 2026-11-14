import { put } from '../api'
import type { Meal, MealInput } from './types'

// edición completa (11.5): reemplaza fecha, tipo, descripción y todos los ítems
export const updateMeal = (
  athleteId: string,
  mealId: string,
  input: MealInput,
) => put<Meal, MealInput>(`/athletes/${athleteId}/meals/${mealId}`, input)
