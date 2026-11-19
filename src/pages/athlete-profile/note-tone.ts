import type { NoteType } from '../../lib/notes'
import type { Tone } from '../../ui/tone'

// badge del tipo de nota (US-46): la privada en gris, la visible con el color de la app
export const noteTypeTone: Record<NoteType, Tone> = {
  PRIVATE: 'neutral',
  VISIBLE_TO_ATHLETE: 'primary',
}
