import { RotateCw, SearchX, UserPlus, Users } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { isApiError } from '../../../lib/api'
import type { Athlete } from '../../../lib/athletes'
import { cn } from '../../../lib/cn'
import { paths } from '../../../router/paths'
import { OutlineButton, PrimaryButton } from '../../../ui/button'
import { Callout } from '../../../ui/callout'
import { Card } from '../../../ui/card'
import { EmptyState } from '../../../ui/empty-state'
import { Skeleton } from '../../../ui/skeleton'
import { AthleteCard } from './AthleteCard'

const gridClasses =
  'grid grid-cols-[repeat(auto-fill,minmax(min(300px,100%),1fr))] gap-5'

const SKELETON_CARDS = 6

type AthletesListProps = {
  athletes: Athlete[] | undefined
  // primera carga, todavía sin datos para mostrar
  isPending: boolean
  // se muestran los datos anteriores mientras llega la página o búsqueda nueva
  isUpdating: boolean
  error: Error | null
  hasFilters: boolean
  onRetry: () => void
}

export function AthletesList({
  athletes,
  isPending,
  isUpdating,
  error,
  hasFilters,
  onRetry,
}: AthletesListProps) {
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

  if (isPending || !athletes) {
    return (
      <div role="status" aria-label="Cargando atletas" className={gridClasses}>
        {Array.from({ length: SKELETON_CARDS }, (_, index) => (
          <Card key={index} padding="sm" className="flex flex-col gap-4.5">
            <div className="flex items-center gap-3">
              <Skeleton className="size-12 rounded-full" />
              <div className="flex flex-col gap-2">
                <Skeleton className="h-5 w-36" />
                <Skeleton className="h-4 w-16" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Skeleton className="h-16" />
              <Skeleton className="h-16" />
            </div>
          </Card>
        ))}
      </div>
    )
  }

  if (athletes.length === 0) {
    return hasFilters ? (
      <EmptyState
        icon={<SearchX />}
        title="No se encontraron atletas"
        description="Probá ajustar la búsqueda o agregá un nuevo atleta para empezar a seguir su progreso."
      />
    ) : (
      <EmptyState
        icon={<Users />}
        title="Todavía no tenés atletas"
        description="Agregá tu primer atleta para empezar a seguir su progreso."
        action={
          <PrimaryButton onClick={() => navigate(paths.newAthlete)}>
            <UserPlus aria-hidden="true" /> Agregar atleta
          </PrimaryButton>
        }
      />
    )
  }

  return (
    <ul
      aria-label="Atletas"
      aria-busy={isUpdating}
      className={cn(
        gridClasses,
        'transition-opacity',
        isUpdating && 'opacity-60',
      )}
    >
      {athletes.map((athlete) => (
        <li key={athlete.id}>
          <AthleteCard athlete={athlete} />
        </li>
      ))}
    </ul>
  )
}
