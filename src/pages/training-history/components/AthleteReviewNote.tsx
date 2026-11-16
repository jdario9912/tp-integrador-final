import { useId } from 'react'
import {
  formatReviewedDate,
  type TrainingSession,
} from '../../../lib/training-sessions'
import { Card } from '../../../ui/card'

type AthleteReviewNoteProps = {
  session: TrainingSession
}

// lo que ve el atleta de la revisión: si su entrenador ya lo revisó, cuándo y la observación. Un
// entrenamiento cancelado no se revisa, así que no muestra nada
export function AthleteReviewNote({ session }: AthleteReviewNoteProps) {
  const titleId = useId()
  if (session.status === 'CANCELLED') return null

  const { review } = session
  return (
    <Card
      padding="sm"
      aria-labelledby={titleId}
      className="flex flex-col gap-2"
    >
      <h3 id={titleId} className="text-[15px] font-semibold">
        Observación de tu entrenador
      </h3>
      {review ? (
        <>
          <p className="text-sm">
            Revisado el{' '}
            <time dateTime={review.reviewedAt}>
              {formatReviewedDate(review.reviewedAt)}
            </time>
          </p>
          <p className="text-[15px] break-words whitespace-pre-line">
            {review.observation ?? 'Sin observaciones.'}
          </p>
        </>
      ) : (
        <p className="text-sm">
          Tu entrenador todavía no revisó este entrenamiento.
        </p>
      )}
    </Card>
  )
}
