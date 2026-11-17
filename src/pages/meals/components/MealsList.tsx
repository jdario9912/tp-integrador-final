import { isApiError } from '../../../lib/api'
import type { Meal } from '../../../lib/meals'
import { Callout } from '../../../ui/callout'
import { EmptyState } from '../../../ui/empty-state'
import { RotateCw, Utensils } from '../../../ui/icons'
import { OutlineButton } from '../../../ui/button'
import { Skeleton } from '../../../ui/skeleton'
import { MealListItem } from './MealListItem'

type MealsListProps = {
  meals: Meal[] | undefined
  isPending: boolean
  // ya hay datos y se vuelven a pedir (tras guardar o borrar)
  isRefreshing: boolean
  error: unknown
  onRetry: () => void
  // id de la comida que está abierta en el formulario
  editingId: string | null
  onEdit: (meal: Meal) => void
  onDelete: (meal: Meal) => void
  // nombre de la lista para el lector de pantalla, y título de su estado vacío (US-24: otro día)
  label?: string
  emptyTitle?: string
}

const UNEXPECTED_ERROR = 'Ocurrió un error inesperado. Intentá nuevamente.'

// comidas de hoy: carga, error con Reintentar, estado vacío y la lista
export function MealsList({
  meals,
  isPending,
  isRefreshing,
  error,
  onRetry,
  editingId,
  onEdit,
  onDelete,
  label = 'Comidas de hoy',
  emptyTitle = 'Todavía no registraste comidas hoy',
}: MealsListProps) {
  if (error) {
    return (
      <div className="flex flex-col items-start gap-3">
        <Callout tone="danger" className="self-stretch">
          {isApiError(error) ? error.message : UNEXPECTED_ERROR}
        </Callout>
        <OutlineButton size="sm" disabled={isRefreshing} onClick={onRetry}>
          <RotateCw aria-hidden="true" /> Reintentar
        </OutlineButton>
      </div>
    )
  }

  if (isPending) {
    return (
      <div
        role="status"
        aria-label="Cargando comidas"
        className="flex flex-col gap-3"
      >
        <Skeleton className="h-20" />
        <Skeleton className="h-20" />
      </div>
    )
  }

  if (!meals || meals.length === 0) {
    return (
      <EmptyState
        size="sm"
        icon={<Utensils />}
        title={emptyTitle}
        description="Elegí el tipo de comida y cargá lo que comiste, con una descripción o con los alimentos y sus cantidades."
      />
    )
  }

  return (
    <ul aria-label={label} aria-busy={isRefreshing} className="flex flex-col">
      {meals.map((meal) => (
        <MealListItem
          key={meal.id}
          meal={meal}
          isEditing={meal.id === editingId}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </ul>
  )
}
