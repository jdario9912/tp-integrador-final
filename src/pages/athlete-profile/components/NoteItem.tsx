import { formatInstantDate } from '../../../lib/iso-date'
import { isNoteRead, noteTypeLabel, type Note } from '../../../lib/notes'
import { Badge } from '../../../ui/badge'
import { noteTypeTone } from '../note-tone'

type NoteItemProps = { note: Note }

// una nota en la ficha (US-46). Si es visible, el entrenador ve si el atleta ya la leyó
export function NoteItem({ note }: NoteItemProps) {
  return (
    <li className="border-border-subtle flex flex-col gap-2 border-b py-4 first:pt-0 last:border-b-0 last:pb-0">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="min-w-0 text-[15px] font-semibold break-words">
          {note.title}
        </h3>
        <Badge tone={noteTypeTone[note.type]}>{noteTypeLabel[note.type]}</Badge>
        {note.type === 'VISIBLE_TO_ATHLETE' &&
          (isNoteRead(note) && note.readAt ? (
            <Badge tone="success">
              Leída el{' '}
              <time dateTime={note.readAt}>
                {formatInstantDate(note.readAt)}
              </time>
            </Badge>
          ) : (
            <Badge tone="warning">Sin leer</Badge>
          ))}
      </div>
      <p className="text-sm break-words whitespace-pre-line">{note.content}</p>
      <p className="text-muted-foreground text-xs">
        Escrita el{' '}
        <time dateTime={note.createdAt}>
          {formatInstantDate(note.createdAt)}
        </time>
      </p>
    </li>
  )
}
