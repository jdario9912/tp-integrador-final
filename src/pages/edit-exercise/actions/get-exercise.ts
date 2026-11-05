import { get } from '../../../lib/api'
import type { Exercise } from '../../../lib/exercises'

// 403 si es de otro entrenador, 404 si no existe o se dio de baja
export const getExercise = (id: string) => get<Exercise>(`/exercises/${id}`)
