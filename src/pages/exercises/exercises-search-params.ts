import { isMuscleGroupCode } from '../../lib/exercises'
import type { ExerciseFilters } from './types'

// límite del backend: un nombre más largo responde 400
export const NAME_MAX_LENGTH = 100

const parsePage = (value: string | null) => {
  const page = Number(value)
  return Number.isInteger(page) && page >= 1 ? page : 1
}

const parseName = (value: string | null) =>
  value?.trim().slice(0, NAME_MAX_LENGTH) || undefined

// un código desconocido se ignora: el backend respondería 400
const parseMuscleGroup = (value: string | null) =>
  value && isMuscleGroupCode(value) ? value : undefined

// la URL es la fuente de verdad del listado: se puede recargar, compartir y volver atrás
export const parseExerciseFilters = (
  searchParams: URLSearchParams,
): ExerciseFilters => ({
  page: parsePage(searchParams.get('page')),
  name: parseName(searchParams.get('name')),
  muscleGroup: parseMuscleGroup(searchParams.get('muscleGroup')),
})

// omite la página 1 y los filtros vacíos para que la URL quede limpia
export const toExerciseSearchParams = ({
  page,
  name,
  muscleGroup,
}: ExerciseFilters) => {
  const searchParams = new URLSearchParams()
  if (name?.trim()) searchParams.set('name', name.trim())
  if (muscleGroup) searchParams.set('muscleGroup', muscleGroup)
  if (page > 1) searchParams.set('page', String(page))
  return searchParams
}
