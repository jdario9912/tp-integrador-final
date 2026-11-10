import { get, type PageResponse } from '../api'
import type { AssignmentsQuery, RoutineAssignment } from './types'

// la activa, si existe, es el primer ítem de la primera página
export const getAssignments = (
  athleteId: string,
  query: AssignmentsQuery = {},
) =>
  get<PageResponse<RoutineAssignment>>(`/athletes/${athleteId}/assignments`, {
    params: query,
  })
