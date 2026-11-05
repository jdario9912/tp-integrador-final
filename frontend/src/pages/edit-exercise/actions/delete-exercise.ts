import { del } from '../../../lib/api'

// baja lógica, 204 sin body: las rutinas que ya lo usan no cambian
export const deleteExercise = (id: string) => del(`/exercises/${id}`)
