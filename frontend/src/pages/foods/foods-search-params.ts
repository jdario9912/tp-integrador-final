import type { FoodFilters } from './types'

// límite del backend: una búsqueda más larga responde 400
export const NAME_MAX_LENGTH = 100

const parsePage = (value: string | null) => {
  const page = Number(value)
  return Number.isInteger(page) && page >= 1 ? page : 1
}

const parseName = (value: string | null) =>
  value?.trim().slice(0, NAME_MAX_LENGTH) || undefined

// la URL es la fuente de verdad del listado: se puede recargar, compartir y volver atrás
export const parseFoodFilters = (
  searchParams: URLSearchParams,
): FoodFilters => ({
  page: parsePage(searchParams.get('page')),
  name: parseName(searchParams.get('name')),
})

// omite la página 1 y el nombre vacío para que la URL quede limpia
export const toFoodSearchParams = ({ page, name }: FoodFilters) => {
  const searchParams = new URLSearchParams()
  if (name?.trim()) searchParams.set('name', name.trim())
  if (page > 1) searchParams.set('page', String(page))
  return searchParams
}
