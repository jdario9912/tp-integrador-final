// US-46: catálogo note_types, serializado con el código como el resto de los enums
export type NoteType = 'PRIVATE' | 'VISIBLE_TO_ATHLETE'

// NoteResponse. El atleta solo recibe las VISIBLE_TO_ATHLETE, nunca las privadas
export type Note = {
  id: string
  title: string
  content: string
  type: NoteType
  // instantes ISO
  createdAt: string
  // null mientras el atleta no la marque como leída; marcarla otra vez conserva la primera fecha
  readAt: string | null
}

// body de POST /athletes/{athleteId}/notes (solo el entrenador)
export type NoteInput = {
  title: string
  content: string
  type: NoteType
}
