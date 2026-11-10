import { post } from '../api'
import type { RoutineDetail } from './types'

// 201 con la copia ("Copia de X", "Copia de X (2)"...), con sus días y ejercicios
export const duplicateRoutine = (id: string) =>
  post<RoutineDetail>(`/routines/${id}/duplicate`, undefined)
