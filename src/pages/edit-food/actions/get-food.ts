import { get } from '../../../lib/api'
import type { Food } from '../../../lib/foods'

// 404 si no existe
export const getFood = (id: string) => get<Food>(`/foods/${id}`)
