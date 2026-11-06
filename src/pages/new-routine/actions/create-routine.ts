import { post } from '../../../lib/api'
import type { Routine, RoutineInput } from '../../../lib/routines'

// queda a nombre del entrenador autenticado; responde 201 con la rutina creada
export const createRoutine = (input: RoutineInput) =>
  post<Routine, RoutineInput>('/routines', input)
