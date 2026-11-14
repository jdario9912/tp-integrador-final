// tipos de comida del catálogo (contrato de US-23, 11.9): en la API viaja el code; el nombre
// en español lo pone el frontend (meal-format.ts)
export const MEAL_TYPES = [
  'BREAKFAST',
  'LUNCH',
  'SNACK',
  'DINNER',
  'COLLATION',
  'PRE_WORKOUT',
  'POST_WORKOUT',
] as const

export type MealType = (typeof MEAL_TYPES)[number]

// ítem de una comida (11.2): nombre y valores son la copia del alimento al momento de cargarlo
export type MealItem = {
  id: string
  foodId: string
  foodName: string
  quantityG: number
  caloriesKcal: number
  proteinG: number
  carbsG: number
  fatG: number
}

// comida de un día (11.2)
export type Meal = {
  id: string
  // día de la comida, YYYY-MM-DD
  date: string
  type: MealType
  // ya recortada; null si no se cargó
  description: string | null
  // suma de las calorías de los ítems; null si la comida no tiene ítems (no es 0)
  totalCaloriesKcal: number | null
  // en el orden en que se cargaron; cambian sus id en cada edición
  items: MealItem[]
  createdAt: string
  updatedAt: string
}

// ítem del body (11.3): las calorías las calcula el backend, no se envían
export type MealItemInput = {
  foodId: string
  quantityG: number
}

// body del alta y de la edición (11.3). La edición es completa: reemplaza todo
export type MealInput = {
  date: string
  type: MealType
  description: string | null
  items: MealItemInput[]
}
