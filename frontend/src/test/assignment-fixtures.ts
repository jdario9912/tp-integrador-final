import type { PageResponse } from '../lib/api'
import type { RoutineAssignment } from '../lib/assignments'

// asignación con la forma que devuelve /athletes/{athleteId}/assignments; por defecto la activa
export const routineAssignment = (
  overrides: Partial<RoutineAssignment> = {},
): RoutineAssignment => ({
  id: 'a1000000-0000-4000-8000-000000000001',
  routineId: '7c9e6679-7425-40de-944b-e07fc1f90ae7',
  routineName: 'Fase de volumen',
  assignmentDate: '2026-11-08',
  active: true,
  ...overrides,
})

// página de GET /athletes/{athleteId}/assignments; por defecto solo la activa
export const assignmentsPage = (
  content: RoutineAssignment[] = [routineAssignment()],
  overrides: Partial<PageResponse<RoutineAssignment>> = {},
): PageResponse<RoutineAssignment> => ({
  content,
  page: 0,
  size: 10,
  totalElements: content.length,
  totalPages: content.length > 0 ? 1 : 0,
  ...overrides,
})
