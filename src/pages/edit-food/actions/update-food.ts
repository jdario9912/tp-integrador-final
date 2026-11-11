import { put } from '../../../lib/api'
import type { Food, FoodInput } from '../../../lib/foods'

// edición completa; cualquier entrenador edita cualquier alimento (el catálogo es global)
export const updateFood = (id: string, input: FoodInput) =>
  put<Food, FoodInput>(`/foods/${id}`, input)
