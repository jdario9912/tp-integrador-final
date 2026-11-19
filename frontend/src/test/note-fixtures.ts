import type { Note } from '../lib/notes'

// nota con la forma de NoteResponse (US-46); por defecto visible y sin leer
export const note = (overrides: Partial<Note> = {}): Note => ({
  id: '8c1d2e3f-4a5b-4c6d-8e7f-9a0b1c2d3e4f',
  title: 'Hidratación',
  content: 'Tomá al menos 2 litros de agua los días de entrenamiento.',
  type: 'VISIBLE_TO_ATHLETE',
  createdAt: '2026-11-14T13:30:00Z',
  readAt: null,
  ...overrides,
})
