import { get, type PageResponse } from '../../../lib/api'
import type { Food } from '../../../lib/foods'
import type { FoodFilters } from '../types'

export const FOODS_PAGE_SIZE = 20

// catálogo global, ordenado por nombre; name busca "contiene" sin distinguir mayúsculas
export const getFoods = ({ page, name }: FoodFilters) =>
  get<PageResponse<Food>>('/foods', {
    params: {
      // el backend pagina desde 0
      page: page - 1,
      size: FOODS_PAGE_SIZE,
      // texto vacío o en blanco no se envía
      name: name?.trim() || undefined,
    },
  })
