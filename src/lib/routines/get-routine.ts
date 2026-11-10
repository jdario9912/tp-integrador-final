import { get } from '../api'
import type { RoutineDetail } from './types'

// incluye los días y ejercicios. 403 si es de otro entrenador, 404 si no existe
export const getRoutine = (id: string) => get<RoutineDetail>(`/routines/${id}`)
