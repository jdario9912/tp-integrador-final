import { get, type PageResponse } from '../../../lib/api'
import type { Food } from '../../../lib/foods'

// el buscador muestra los primeros resultados: para encontrar otro se refina el texto (11.14)
export const FOOD_SEARCH_SIZE = 20

// GET /foods?name=&size=: name vacío o en blanco no se envía, y sin nombre son los primeros del catálogo
export const searchFoods = (name: string) =>
  get<PageResponse<Food>>('/foods', {
    params: {
      name: name.trim() || undefined,
      size: FOOD_SEARCH_SIZE,
    },
  })
