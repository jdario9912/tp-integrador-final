import { useState } from 'react'
import { isApiError } from '../../../lib/api'
import { cn } from '../../../lib/cn'
import { formatInstantDate } from '../../../lib/iso-date'
import {
  isNoteRead,
  useMarkNoteRead,
  useNotes,
  type Note,
} from '../../../lib/notes'
import { OutlineButton } from '../../../ui/button'
import { Callout } from '../../../ui/callout'
import { Card } from '../../../ui/card'
import { EmptyState } from '../../../ui/empty-state'
import { Check, NotebookPen } from '../../../ui/icons'
import { CardError } from './CardError'
import { CardSkeleton } from './CardSkeleton'
import { DashboardCardHeader } from './DashboardCardHeader'

const TITLE_ID = 'dashboard-notes-title'

type AthleteNotesCardProps = {
  athleteId: string
  className?: string
}

const unreadLabel = (count: number) =>
  count === 1 ? '1 sin leer' : `${count} sin leer`

// notas que el entrenador marcó como visibles (US-46): el backend nunca manda las privadas. Las
// sin leer se destacan y se pueden marcar como leídas
export function AthleteNotesCard({
  athleteId,
  className,
}: AthleteNotesCardProps) {
  const notes = useNotes(athleteId)
  const markRead = useMarkNoteRead(athleteId)
  // error de la última nota que se intentó marcar
  const [failed, setFailed] = useState<{ noteId: string; message: string }>()

  const handleMarkRead = async (note: Note) => {
    setFailed(undefined)
    try {
      await markRead.mutateAsync(note.id)
    } catch (error) {
      setFailed({
        noteId: note.id,
        message: isApiError(error)
          ? error.message
          : 'Ocurrió un error inesperado. Intentá nuevamente.',
      })
    }
  }

  const unread = notes.data?.filter((note) => !isNoteRead(note)).length ?? 0

  const content = () => {
    if (notes.isPending) {
      return <CardSkeleton label="Cargando las notas" rows={3} />
    }

    if (notes.data === undefined) {
      return (
        <CardError
          error={notes.error}
          isRetrying={notes.isFetching}
          onRetry={() => void notes.refetch()}
        />
      )
    }

    if (notes.data.length === 0) {
      return (
        <EmptyState
          size="sm"
          icon={<NotebookPen />}
          title="Tu entrenador todavía no te dejó notas"
          description="Cuando te escriba una indicación, la vas a ver acá."
        />
      )
    }

    return (
      // muchas notas no estiran el panel: la lista se desplaza
      <ul
        aria-labelledby={TITLE_ID}
        className="flex max-h-120 flex-col gap-3 overflow-y-auto"
      >
        {notes.data.map((note) => {
          const read = isNoteRead(note)
          const isMarking = markRead.isPending && markRead.variables === note.id
          return (
            <li
              key={note.id}
              className={cn(
                'rounded-control flex flex-col gap-2 border p-3',
                read
                  ? 'border-border-subtle'
                  : 'border-primary-soft-strong bg-primary-soft',
              )}
            >
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                <h3 className="min-w-0 text-[15px] font-semibold break-words">
                  {!read && <span className="sr-only">Sin leer: </span>}
                  {note.title}
                </h3>
                <time
                  dateTime={note.createdAt}
                  className="text-muted-foreground text-xs"
                >
                  {formatInstantDate(note.createdAt)}
                </time>
              </div>
              <p className="text-sm break-words whitespace-pre-line">
                {note.content}
              </p>
              {read && note.readAt ? (
                <p className="text-muted-foreground flex items-center gap-1.5 text-xs">
                  <Check aria-hidden="true" className="size-4" />
                  Leída el{' '}
                  <time dateTime={note.readAt}>
                    {formatInstantDate(note.readAt)}
                  </time>
                </p>
              ) : (
                <OutlineButton
                  size="sm"
                  className="min-h-11 self-stretch sm:self-start"
                  disabled={isMarking}
                  aria-label={`Marcar como leída: ${note.title}`}
                  onClick={() => void handleMarkRead(note)}
                >
                  <Check aria-hidden="true" />
                  {isMarking ? 'Marcando…' : 'Marcar como leída'}
                </OutlineButton>
              )}
              {failed?.noteId === note.id && (
                <Callout tone="danger">{failed.message}</Callout>
              )}
            </li>
          )
        })}
      </ul>
    )
  }

  return (
    <Card
      aria-labelledby={TITLE_ID}
      aria-busy={notes.isPending}
      className={cn('flex flex-col gap-4', className)}
    >
      <DashboardCardHeader
        id={TITLE_ID}
        title="Notas de tu entrenador"
        icon={<NotebookPen />}
        action={
          unread > 0 && (
            <span className="text-primary text-sm font-semibold">
              {unreadLabel(unread)}
            </span>
          )
        }
      />
      {content()}
    </Card>
  )
}
