import { patch } from '../api'
import type { Note } from './types'

// US-46: solo el atleta. Idempotente (conserva el primer readAt); 404 si es privada o no existe
export const markNoteRead = (athleteId: string, noteId: string) =>
  patch<Note>(`/athletes/${athleteId}/notes/${noteId}/read`, undefined)
