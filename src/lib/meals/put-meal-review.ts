import { put } from '../api'
import type { Meal, MealReviewInput } from './types'

// solo el entrenador del atleta (US-25): el atleta recibe 403. Revisar otra vez reemplaza el
// comentario. 200 con la comida completa (con review); 400 si el comentario supera 1000 caracteres;
// 404 si la comida no existe o es de otro atleta
export const putMealReview = (
  athleteId: string,
  mealId: string,
  input: MealReviewInput,
) =>
  put<Meal, MealReviewInput>(
    `/athletes/${athleteId}/meals/${mealId}/review`,
    input,
  )
