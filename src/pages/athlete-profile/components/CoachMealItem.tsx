import { useEffect, useId, useState } from 'react'
import { formatGrams, formatKcal } from '../../../lib/foods'
import {
  formatMealKcal,
  mealTypeLabel,
  NO_CALORIES,
  type Meal,
} from '../../../lib/meals'
import { formatReviewedDate } from '../../../lib/training-sessions'
import { Badge } from '../../../ui/badge'
import { OutlineButton } from '../../../ui/button'
import { Callout } from '../../../ui/callout'
import { Utensils } from '../../../ui/icons'
import { IconChip } from '../../../ui/icon-chip'
import { MealReviewForm } from './MealReviewForm'

type CoachMealItemProps = {
  athleteId: string
  meal: Meal
}

// una comida del día vista por el entrenador (US-25): lo que cargó el atleta, si ya la revisó (con
// su comentario) y la acción para revisarla. Sin editar ni borrar: la comida es del atleta
export function CoachMealItem({ athleteId, meal }: CoachMealItemProps) {
  const [isReviewing, setIsReviewing] = useState(false)
  const [notice, setNotice] = useState<string>()
  const toggleId = useId()
  // al cerrar el formulario el foco vuelve al botón, que aparece recién después de renderizar
  const [focusRequest, setFocusRequest] = useState<object>()
  const label = mealTypeLabel(meal.type)
  const { review } = meal

  useEffect(() => {
    if (focusRequest) document.getElementById(toggleId)?.focus()
  }, [focusRequest, toggleId])

  const close = () => {
    setIsReviewing(false)
    setFocusRequest({})
  }

  return (
    <li className="border-border-subtle flex items-start gap-4 border-b py-4 last:border-b-0">
      <IconChip shape="square" size="sm" className="mt-0.5">
        <Utensils />
      </IconChip>

      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          <h4 className="font-semibold">{label}</h4>
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

        <div className="mt-1 flex flex-col gap-1.5">
          {review ? (
            <Badge tone="success" dot>
              Revisada el{' '}
              <time dateTime={review.reviewedAt}>
                {formatReviewedDate(review.reviewedAt)}
              </time>
            </Badge>
          ) : (
            <Badge tone="warning" dot>
              Pendiente de revisión
            </Badge>
          )}
          {review?.observation && (
            <p className="border-border border-l-2 pl-3 text-sm break-words whitespace-pre-line">
              <span className="sr-only">Tu comentario: </span>
              {review.observation}
            </p>
          )}
        </div>

        {notice && !isReviewing && (
          <Callout tone="success" role="status">
            {notice}
          </Callout>
        )}

        {isReviewing ? (
          <MealReviewForm
            athleteId={athleteId}
            meal={meal}
            onSaved={(message) => {
              setNotice(message)
              close()
            }}
            onCancel={close}
          />
        ) : (
          <OutlineButton
            id={toggleId}
            size="sm"
            className="self-start"
            aria-label={`${review ? 'Editar revisión de' : 'Revisar'} ${label.toLowerCase()}`}
            onClick={() => {
              setNotice(undefined)
              setIsReviewing(true)
            }}
          >
            {review ? 'Editar revisión' : 'Revisar'}
          </OutlineButton>
        )}
      </div>
    </li>
  )
}
