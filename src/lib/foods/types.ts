// alimento del catálogo global (GET /foods): no tiene autor, lo ven los dos roles.
// Los valores nutricionales corresponden a la porción de referencia (hasta 2 decimales)
export type Food = {
  id: string
  name: string
  referencePortionG: number
  caloriesKcal: number
  proteinG: number
  carbsG: number
  fatG: number
}

// body de POST y PUT /foods (solo entrenador): la edición es completa
export type FoodInput = Omit<Food, 'id'>
