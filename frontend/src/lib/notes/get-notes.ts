import { get } from '../api'
import type { Note } from './types'

// US-46: las más recientes primero. El entrenador ve todas; el atleta (con su propio id), solo las
// visibles. 403 si el atleta es de otro entrenador
export const getNotes = (athleteId: string) =>
  get<Note[]>(`/athletes/${athleteId}/notes`)
