import type { DeepKeys } from '@tanstack/react-form'
import type { MealType } from '../../lib/meals'

// en el formulario todos los números son strings, como los devuelven los inputs
export type MealItemFormValues = {
  // clave estable de la fila: el índice cambia al quitar otra fila. No viaja a la API
  key: string
  foodId: string
  foodName: string
  quantityG: string
}

export type MealFormValues = {
  type: MealType
  // sin recortar: se recorta al enviar
  description: string
  items: MealItemFormValues[]
}

// rutas de los campos del formulario, incluidos los de cada alimento (items[0].quantityG)
export type MealFieldName = DeepKeys<MealFormValues>

// resumen de un día (US-24, contrato 31): totales en 2 decimales, sumados de los ítems ya redondeados
export type DailyNutritionSummary = {
  // día del resumen, YYYY-MM-DD
  date: string
  caloriesKcal: number
  proteinG: number
  carbsG: number
  fatG: number
  // comidas del día, también las que no tienen datos nutricionales
  mealCount: number
  // comidas sin ítems: no entran en el total y la página lo avisa
  mealsWithoutNutrition: number
}
