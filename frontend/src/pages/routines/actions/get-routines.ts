import { get, type PageResponse } from '../../../lib/api'
import type { Routine } from '../../../lib/routines'
import type { RoutinesQuery } from '../types'

export const ROUTINES_PAGE_SIZE = 20

// solo las rutinas del entrenador autenticado, ordenadas por nombre
export const getRoutines = ({ page }: RoutinesQuery) =>
  get<PageResponse<Routine>>('/routines', {
    // el backend pagina desde 0
    params: { page: page - 1, size: ROUTINES_PAGE_SIZE },
  })
