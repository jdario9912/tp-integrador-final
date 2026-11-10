import { put } from '../../../lib/api'
import type { RoutineDetail, RoutineInput } from '../../../lib/routines'

// edición completa de los datos generales: un opcional en null borra el dato. 409 si el
// nombre ya lo usa otra rutina propia
export const updateRoutine = (id: string, input: RoutineInput) =>
  put<RoutineDetail, RoutineInput>(`/routines/${id}`, input)
