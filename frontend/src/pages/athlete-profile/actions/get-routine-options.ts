import { get, type PageResponse } from '../../../lib/api'
import type { Routine } from '../../../lib/routines'

// opciones del selector de rutinas: una sola página grande, ordenada por nombre
export const ROUTINE_OPTIONS_SIZE = 100

export const getRoutineOptions = () =>
  get<PageResponse<Routine>>('/routines', {
    params: { size: ROUTINE_OPTIONS_SIZE },
  })
