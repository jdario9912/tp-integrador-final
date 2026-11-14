import { post } from '../api'
import type { Meal, MealInput } from './types'

// alta (11.4): 201 con la comida; sin header Location
export const createMeal = (athleteId: string, input: MealInput) =>
  post<Meal, MealInput>(`/athletes/${athleteId}/meals`, input)
