import type { PageResponse } from '../lib/api'
import type { Food } from '../lib/foods'

// alimento del catálogo con la forma que devuelve /foods
export const createdFood = (overrides: Partial<Food> = {}): Food => ({
  id: '7c1e2d3f-4a5b-4c6d-8e7f-9a0b1c2d3e4f',
  name: 'Manzana',
  referencePortionG: 100,
  caloriesKcal: 52,
  proteinG: 0.3,
  carbsG: 14,
  fatG: 0.2,
  ...overrides,
})

// página de GET /foods; por defecto un solo alimento y una sola página
export const foodsPage = (
  content: Food[] = [createdFood()],
  overrides: Partial<PageResponse<Food>> = {},
): PageResponse<Food> => ({
  content,
  page: 0,
  size: 20,
  totalElements: content.length,
  totalPages: content.length > 0 ? 1 : 0,
  ...overrides,
})
