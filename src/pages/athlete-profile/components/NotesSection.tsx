import { isApiError } from '../../../lib/api'
import { useNotes } from '../../../lib/notes'
import { OutlineButton } from '../../../ui/button'
import { Callout } from '../../../ui/callout'
import { SectionCard } from '../../../ui/card'
import { EmptyState } from '../../../ui/empty-state'
import { NotebookPen, RotateCw } from '../../../ui/icons'
import { Skeleton } from '../../../ui/skeleton'
import { NoteForm } from './NoteForm'
import { NoteItem } from './NoteItem'

type NotesSectionProps = { athleteId: string }

// notas del entrenador sobre el atleta (US-46): el alta arriba y todas sus notas, privadas y
// visibles, de la más reciente a la más antigua (orden del backend). Carga y error propios
export function NotesSection({ athleteId }: NotesSectionProps) {
  const { data, error, isPending, isFetching, refetch } = useNotes(athleteId)

  const list = () => {
    if (error) {
      return (
        <div className="flex flex-col items-start gap-3">
          <Callout tone="danger" className="self-stretch">
            No se pudieron cargar las notas.{' '}
            {isApiError(error) ? error.message : ''}
          </Callout>
          <OutlineButton
            size="sm"
            disabled={isFetching}
            onClick={() => void refetch()}
          >
            <RotateCw aria-hidden="true" />
            {isFetching ? 'Reintentando...' : 'Reintentar'}
          </OutlineButton>
        </div>
      )
    }

    if (isPending) {
      return (
        <div
          role="status"
          aria-label="Cargando las notas"
          className="flex flex-col gap-2"
        >
          <Skeleton className="h-5 w-48 max-w-full motion-reduce:animate-none" />
          <Skeleton className="h-4 w-full motion-reduce:animate-none" />
          <Skeleton className="h-4 w-3/4 motion-reduce:animate-none" />
        </div>
      )
    }

    if (data.length === 0) {
      return (
        <EmptyState
          size="sm"
          icon={<NotebookPen />}
          title="Todavía no escribiste notas sobre este atleta"
          description="Las privadas solo las ves vos; las visibles le aparecen en su panel."
        />
      )
    }

    return (
      <ul aria-label="Notas del atleta" className="flex flex-col">
        {data.map((note) => (
          <NoteItem key={note.id} note={note} />
        ))}
      </ul>
    )
  }

  return (
    <SectionCard title="Notas" icon={<NotebookPen />} aria-label="Notas">
      <NoteForm athleteId={athleteId} />
      <div className="border-border-subtle border-t pt-5">{list()}</div>
    </SectionCard>
  )
}
