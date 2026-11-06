import type { RoutinesQuery } from './types'

const parsePage = (value: string | null) => {
  const page = Number(value)
  return Number.isInteger(page) && page >= 1 ? page : 1
}

// la URL es la fuente de verdad del listado: se puede recargar, compartir y volver atrás
export const parseRoutinesQuery = (
  searchParams: URLSearchParams,
): RoutinesQuery => ({
  page: parsePage(searchParams.get('page')),
})

// omite la página 1 para que la URL quede limpia
export const toRoutinesSearchParams = ({ page }: RoutinesQuery) => {
  const searchParams = new URLSearchParams()
  if (page > 1) searchParams.set('page', String(page))
  return searchParams
}
