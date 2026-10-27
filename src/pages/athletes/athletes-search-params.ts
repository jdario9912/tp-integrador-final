import type { AthleteFilters } from './types'

// límites del backend: un texto más largo responde 400
export const NAME_MAX_LENGTH = 100
export const GOAL_MAX_LENGTH = 255

const parsePage = (value: string | null) => {
  const page = Number(value)
  return Number.isInteger(page) && page >= 1 ? page : 1
}

const parseText = (value: string | null, maxLength: number) =>
  value?.trim().slice(0, maxLength) || undefined

// la URL es la fuente de verdad del listado: se puede recargar, compartir y volver atrás
export const parseAthleteFilters = (
  searchParams: URLSearchParams,
): AthleteFilters => ({
  page: parsePage(searchParams.get('page')),
  name: parseText(searchParams.get('name'), NAME_MAX_LENGTH),
  goal: parseText(searchParams.get('goal'), GOAL_MAX_LENGTH),
})

// omite la página 1 y los filtros vacíos para que la URL quede limpia
export const toAthleteSearchParams = ({ page, name, goal }: AthleteFilters) => {
  const searchParams = new URLSearchParams()
  if (name?.trim()) searchParams.set('name', name.trim())
  if (goal?.trim()) searchParams.set('goal', goal.trim())
  if (page > 1) searchParams.set('page', String(page))
  return searchParams
}
