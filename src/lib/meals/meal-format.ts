import { formatKcal } from '../foods'
import { MEAL_TYPES, type MealType } from './types'

// nombres en español de los tipos de comida (contrato 11.9)
export const MEAL_TYPE_LABELS: Record<MealType, string> = {
  BREAKFAST: 'Desayuno',
  LUNCH: 'Almuerzo',
  SNACK: 'Merienda',
  DINNER: 'Cena',
  COLLATION: 'Colación',
  PRE_WORKOUT: 'Pre-entrenamiento',
  POST_WORKOUT: 'Post-entrenamiento',
}

export const mealTypeLabel = (type: MealType) => MEAL_TYPE_LABELS[type]

// opciones para el selector, en el orden del catálogo
export const MEAL_TYPE_OPTIONS = MEAL_TYPES.map((value) => ({
  value,
  label: MEAL_TYPE_LABELS[value],
}))

// guion para las calorías que no se pueden calcular (comida solo con descripción): nunca un 0
export const NO_CALORIES = '-'

export const formatMealKcal = (kcal: number | null) =>
  kcal === null ? NO_CALORIES : formatKcal(kcal)
