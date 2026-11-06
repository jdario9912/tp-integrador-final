import { get } from '../../../lib/api'
import type { Routine } from '../../../lib/routines'

// 403 si es de otro entrenador, 404 si no existe
export const getRoutine = (id: string) => get<Routine>(`/routines/${id}`)
