import type { DailyNutritionSummary } from '../meals/types'

// alimentación de un atleta en un rango de días (US-25): el resumen de cada día (el de US-24) y la
// constancia de registro. No hay plan nutricional objetivo: la adherencia es la constancia
export type NutritionOverview = {
  // rango consultado, YYYY-MM-DD, inclusivo
  from: string
  to: string
  // días del rango (de 1 a 31)
  totalDays: number
  // días con al menos una comida cargada
  daysWithMeals: number
  // un resumen por día, de from a to y en orden; los días sin comidas vienen en cero
  days: DailyNutritionSummary[]
}

export type NutritionRange = { from: string; to: string }
