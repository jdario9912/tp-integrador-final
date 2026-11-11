import { post } from '../../../lib/api'
import type { Food, FoodInput } from '../../../lib/foods'

// solo entrenador: el atleta recibe 403; un nombre repetido responde 409
export const createFood = (input: FoodInput) =>
  post<Food, FoodInput>('/foods', input)
