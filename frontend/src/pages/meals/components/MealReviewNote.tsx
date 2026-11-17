import type { MealReview } from '../../../lib/meals'
import { formatReviewedDate } from '../../../lib/training-sessions'
import { Badge } from '../../../ui/badge'

type MealReviewNoteProps = {
  review: MealReview | null
}

// lo que ve el atleta de la revisión de una comida (US-25): una marca discreta y, si lo hay, el
// comentario de su entrenador. Solo lectura; sin revisión no muestra nada (no es un pendiente suyo)
export function MealReviewNote({ review }: MealReviewNoteProps) {
  if (!review) return null

  return (
    <div className="mt-1 flex flex-col gap-1.5">
      <Badge tone="success" dot>
        Revisada por tu entrenador el{' '}
        <time dateTime={review.reviewedAt}>
          {formatReviewedDate(review.reviewedAt)}
        </time>
      </Badge>
      {review.observation && (
        <p className="border-border border-l-2 pl-3 text-sm break-words whitespace-pre-line">
          <span className="sr-only">Comentario de tu entrenador: </span>
          {review.observation}
        </p>
      )}
    </div>
  )
}
