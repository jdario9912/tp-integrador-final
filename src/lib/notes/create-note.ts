import { post } from '../api'
import type { Note, NoteInput } from './types'

// US-46: solo el entrenador. 400 si está vacía o es demasiado larga; 403 si el atleta es ajeno
export const createNote = (athleteId: string, input: NoteInput) =>
  post<Note, NoteInput>(`/athletes/${athleteId}/notes`, input)
