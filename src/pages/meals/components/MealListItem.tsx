import { cn } from '../../../lib/cn'
import { formatGrams, formatKcal } from '../../../lib/foods'
import {
  formatMealKcal,
  mealTypeLabel,
  NO_CALORIES,
  type Meal,
} from '../../../lib/meals'
import { IconButton } from '../../../ui/icon-button'
import { Pencil, Trash2, Utensils } from '../../../ui/icons'
import { IconChip } from '../../../ui/icon-chip'

type MealListItemProps = {
  meal: Meal
  // la comida está abierta en el formulario
  isEditing: boolean
  onEdit: (meal: Meal) => void
  onDelete: (meal: Meal) => void
}

// lo que identifica a la comida para quien usa lector de pantalla: el tipo y su contenido
const mealSummary = (meal: Meal) => {
  const label = mealTypeLabel(meal.type)
  const content =
    meal.description ?? meal.items.map((item) => item.foodName).join(', ')
  return content ? `${label}: ${content}` : label
}

// una comida del día: tipo, descripción, alimentos con sus cantidades y calorías
export function MealListItem({
  meal,
  isEditing,
  onEdit,
  onDelete,
}: MealListItemProps) {
  const label = mealTypeLabel(meal.type)
  const summary = mealSummary(meal)

  return (
    <li
      className={cn(
        'border-border-subtle flex items-start gap-4 border-b py-4 last:border-b-0',
        // borde y no fondo: el texto secundario mantiene el contraste
        isEditing && 'border-l-primary border-l-[3px] pl-3',
      )}
    >
      <IconChip shape="square" size="sm" className="mt-0.5">
        <Utensils />
      </IconChip>

      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          <h3 className="font-semibold">{label}</h3>
          <span className="text-sm font-semibold tabular-nums">
            {meal.totalCaloriesKcal === null ? (
              <>
                <span aria-hidden="true">{NO_CALORIES}</span>
                <span className="sr-only">Sin calorías calculadas</span>
              </>
            ) : (
              formatMealKcal(meal.totalCaloriesKcal)
            )}
          </span>
        </div>

        {meal.description && (
          <p className="text-sm break-words whitespace-pre-line">
            {meal.description}
          </p>
        )}

        {meal.items.length > 0 && (
          <ul className="text-muted-foreground flex flex-col gap-0.5 text-sm">
            {meal.items.map((item) => (
              <li key={item.id} className="break-words">
                {item.foodName} · {formatGrams(item.quantityG)} ·{' '}
                {formatKcal(item.caloriesKcal)}
              </li>
            ))}
          </ul>
        )}

        {isEditing && (
          <span className="text-primary mt-1 text-sm font-semibold">
            Editando
          </span>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-1">
        <IconButton
          aria-label={`Editar ${summary}`}
          className="size-11"
          onClick={() => onEdit(meal)}
        >
          <Pencil aria-hidden="true" />
        </IconButton>
        <IconButton
          aria-label={`Borrar ${summary}`}
          className="text-danger hover:text-danger size-11"
          onClick={() => onDelete(meal)}
        >
          <Trash2 aria-hidden="true" />
        </IconButton>
      </div>
    </li>
  )
}
