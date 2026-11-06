import { isApiError } from '../../../lib/api'
import { cn } from '../../../lib/cn'
import { useNavigate } from '../../../lib/navigation'
import type { Routine } from '../../../lib/routines'
import { paths } from '../../../router/paths'
import { OutlineButton, PrimaryButton } from '../../../ui/button'
import { Callout } from '../../../ui/callout'
import { Card } from '../../../ui/card'
import { EmptyState } from '../../../ui/empty-state'
import { ClipboardList, Plus, RotateCw } from '../../../ui/icons'
import { Skeleton } from '../../../ui/skeleton'
import { RoutineCard } from './RoutineCard'

const gridClasses =
  'grid grid-cols-[repeat(auto-fill,minmax(min(300px,100%),1fr))] gap-5'

const SKELETON_CARDS = 6

type RoutinesListProps = {
  routines: Routine[] | undefined
  // primera carga, todavía sin datos para mostrar
  isPending: boolean
  // se muestran los datos anteriores mientras llega la página nueva
  isUpdating: boolean
  error: Error | null
  onRetry: () => void
}

export function RoutinesList({
  routines,
  isPending,
  isUpdating,
  error,
  onRetry,
}: RoutinesListProps) {
  const navigate = useNavigate()

  if (error) {
    return (
      <div className="flex flex-col items-start gap-3">
        <Callout tone="danger" className="self-stretch">
          {isApiError(error)
            ? error.message
            : 'Ocurrió un error inesperado. Intentá nuevamente.'}
        </Callout>
        <OutlineButton size="sm" onClick={onRetry}>
          <RotateCw aria-hidden="true" /> Reintentar
        </OutlineButton>
      </div>
    )
  }

  if (isPending || !routines) {
    return (
      <div role="status" aria-label="Cargando rutinas" className={gridClasses}>
        {Array.from({ length: SKELETON_CARDS }, (_, index) => (
          <Card key={index} padding="sm" className="flex flex-col gap-4">
            <div className="flex items-start gap-3">
              <Skeleton className="size-11 rounded-lg" />
              <div className="flex flex-col gap-2">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-6 w-24 rounded-full" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Skeleton className="h-14 rounded-lg" />
              <Skeleton className="h-14 rounded-lg" />
            </div>
            <Skeleton className="h-10" />
          </Card>
        ))}
      </div>
    )
  }

  if (routines.length === 0) {
    return (
      <EmptyState
        icon={<ClipboardList />}
        title="Todavía no tenés rutinas"
        description="Creá tu primera rutina para después cargarle los días y asignarla a tus atletas."
        action={
          <PrimaryButton onClick={() => navigate(paths.newRoutine)}>
            <Plus aria-hidden="true" /> Nueva rutina
          </PrimaryButton>
        }
      />
    )
  }

  return (
    <ul
      aria-label="Rutinas"
      aria-busy={isUpdating}
      className={cn(
        gridClasses,
        'transition-opacity',
        isUpdating && 'opacity-60',
      )}
    >
      {routines.map((routine) => (
        <li key={routine.id}>
          <RoutineCard routine={routine} />
        </li>
      ))}
    </ul>
  )
}
