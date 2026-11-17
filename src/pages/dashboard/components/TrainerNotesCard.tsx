import { cn } from '../../../lib/cn'
import { formatIsoDate } from '../../../lib/iso-date'
import {
  formatDayLabel,
  formatReviewedDate,
} from '../../../lib/training-sessions'
import { paths } from '../../../router/paths'
import { Card } from '../../../ui/card'
import { EmptyState } from '../../../ui/empty-state'
import { ClipboardCheck } from '../../../ui/icons'
import { TextLink } from '../../../ui/text-link'
import { useTrainerObservations } from '../hooks/use-trainer-observations'
import { CardError } from './CardError'
import { CardSkeleton } from './CardSkeleton'
import { DashboardCardHeader } from './DashboardCardHeader'

const TITLE_ID = 'dashboard-observations-title'

type TrainerNotesCardProps = {
  athleteId: string
  className?: string
}

// las últimas observaciones del entrenador sobre sus entrenamientos (US-21), con el enlace al historial
export function TrainerNotesCard({
  athleteId,
  className,
}: TrainerNotesCardProps) {
  const history = useTrainerObservations(athleteId)
  const { observations } = history

  const content = () => {
    if (history.isPending) {
      return <CardSkeleton label="Cargando las observaciones" rows={3} />
    }

    if (observations === undefined) {
      return (
        <CardError
          error={history.error}
          isRetrying={history.isFetching}
          onRetry={() => void history.refetch()}
        />
      )
    }

    if (observations.length === 0) {
      return (
        <EmptyState
          size="sm"
          icon={<ClipboardCheck />}
          title="Tu entrenador todavía no dejó observaciones"
          description="Cuando revise uno de tus entrenamientos y deje una nota, la vas a ver acá."
        />
      )
    }

    return (
      <ul aria-label="Observaciones del entrenador" className="flex flex-col">
        {observations.map((item) => (
          <li
            key={item.id}
            className="border-border-subtle flex flex-col gap-1 border-b py-3 first:pt-0 last:border-b-0 last:pb-0"
          >
            <p className="text-sm font-semibold">{formatDayLabel(item)}</p>
            <p className="text-muted-foreground text-sm">
              Entrenamiento del {formatIsoDate(item.sessionDate)}
            </p>
            <p className="text-sm break-words">{item.review?.observation}</p>
            {item.review && (
              <p className="text-muted-foreground text-xs">
                Revisada el {formatReviewedDate(item.review.reviewedAt)}
              </p>
            )}
          </li>
        ))}
      </ul>
    )
  }

  return (
    <Card
      aria-labelledby={TITLE_ID}
      aria-busy={history.isPending}
      className={cn('flex flex-col gap-4', className)}
    >
      <DashboardCardHeader
        id={TITLE_ID}
        title="Observaciones del entrenador"
        icon={<ClipboardCheck />}
        action={
          <TextLink to={paths.trainingHistory}>Ver entrenamientos</TextLink>
        }
      />
      {content()}
    </Card>
  )
}
