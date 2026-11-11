import { isApiError } from '../../../lib/api'
import { cn } from '../../../lib/cn'
import type { Food } from '../../../lib/foods'
import { useNavigate } from '../../../lib/navigation'
import { paths } from '../../../router/paths'
import { OutlineButton, PrimaryButton } from '../../../ui/button'
import { Callout } from '../../../ui/callout'
import { Card } from '../../../ui/card'
import { EmptyState } from '../../../ui/empty-state'
import { Apple, Plus, RotateCw, SearchX } from '../../../ui/icons'
import { Skeleton } from '../../../ui/skeleton'
import { FoodCard } from './FoodCard'

const gridClasses =
  'grid grid-cols-[repeat(auto-fill,minmax(min(300px,100%),1fr))] gap-5'

const SKELETON_CARDS = 6

type FoodsListProps = {
  foods: Food[] | undefined
  // primera carga, todavía sin datos para mostrar
  isPending: boolean
  // se muestran los datos anteriores mientras llega la página o búsqueda nueva
  isUpdating: boolean
  error: Error | null
  hasFilters: boolean
  // solo el entrenador crea y edita alimentos
  canEdit: boolean
  onRetry: () => void
}

export function FoodsList({
  foods,
  isPending,
  isUpdating,
  error,
  hasFilters,
  canEdit,
  onRetry,
}: FoodsListProps) {
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

  if (isPending || !foods) {
    return (
      <div
        role="status"
        aria-label="Cargando alimentos"
        className={gridClasses}
      >
        {Array.from({ length: SKELETON_CARDS }, (_, index) => (
          <Card key={index} padding="sm" className="flex flex-col gap-4">
            <div className="flex items-start gap-3">
              <Skeleton className="size-11 rounded-lg" />
              <div className="flex flex-col gap-2">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-6 w-28 rounded-full" />
              </div>
            </div>
            <Skeleton className="h-32" />
          </Card>
        ))}
      </div>
    )
  }

  if (foods.length === 0) {
    if (hasFilters) {
      return (
        <EmptyState
          icon={<SearchX />}
          title="No se encontraron alimentos"
          description="Probá con otro nombre."
        />
      )
    }
    return canEdit ? (
      <EmptyState
        icon={<Apple />}
        title="Todavía no hay alimentos"
        description="Cargá el primer alimento del catálogo con sus valores nutricionales."
        action={
          <PrimaryButton onClick={() => navigate(paths.newFood)}>
            <Plus aria-hidden="true" /> Nuevo alimento
          </PrimaryButton>
        }
      />
    ) : (
      <EmptyState
        icon={<Apple />}
        title="Todavía no hay alimentos"
        description="El catálogo todavía no tiene alimentos cargados."
      />
    )
  }

  return (
    <ul
      aria-label="Alimentos"
      aria-busy={isUpdating}
      className={cn(
        gridClasses,
        'transition-opacity',
        isUpdating && 'opacity-60',
      )}
    >
      {foods.map((food) => (
        <li key={food.id}>
          <FoodCard food={food} canEdit={canEdit} />
        </li>
      ))}
    </ul>
  )
}
