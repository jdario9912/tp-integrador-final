import type { Note, NoteType } from './types'

export const NOTE_TITLE_MAX_LENGTH = 150
export const NOTE_CONTENT_MAX_LENGTH = 2000

export const noteTypeLabel: Record<NoteType, string> = {
  PRIVATE: 'Privada',
  VISIBLE_TO_ATHLETE: 'Visible para el atleta',
}

export const isNoteRead = (note: Pick<Note, 'readAt'>) => note.readAt !== null

// mismas reglas y límites que el backend (los dos son obligatorios)
export const validateNoteTitle = (value: string) => {
  if (!value.trim()) return 'El título es obligatorio'
  if (value.trim().length > NOTE_TITLE_MAX_LENGTH)
    return `El título puede tener hasta ${NOTE_TITLE_MAX_LENGTH} caracteres`
  return undefined
}

export const validateNoteContent = (value: string) => {
  if (!value.trim()) return 'El contenido es obligatorio'
  if (value.trim().length > NOTE_CONTENT_MAX_LENGTH)
    return `El contenido puede tener hasta ${NOTE_CONTENT_MAX_LENGTH} caracteres`
  return undefined
}
