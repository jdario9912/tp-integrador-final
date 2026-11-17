import { cn } from '../../../lib/cn'
import { formatIsoDate } from '../../../lib/iso-date'
import { formatWeightKg, useWeights } from '../../../lib/weights'
import { paths } from '../../../router/paths'
import { Card } from '../../../ui/card'
import { EmptyState } from '../../../ui/empty-state'
import { Scale } from '../../../ui/icons'
import { TextLink } from '../../../ui/text-link'
import { CardError } from './CardError'
import { CardSkeleton } from './CardSkeleton'
import { DashboardCardHeader } from './DashboardCardHeader'

const TITLE_ID = 'dashboard-weight-title'

// solo el registro más reciente: la API ordena por fecha descendente (contrato 8.6)
const LATEST_WEIGHT_QUERY = { size: 1 }

type LatestWeightCardProps = {
  athleteId: string
  className?: string
}

// último peso registrado, con su fecha. Vacío: invita a registrar el primero
export function LatestWeightCard({
  athleteId,
  className,
}: LatestWeightCardProps) {
  const weights = useWeights(athleteId, LATEST_WEIGHT_QUERY)
  const latest = weights.data?.content[0] ?? null

  const content = () => {
    if (weights.isPending) {
      return <CardSkeleton label="Cargando el último peso" rows={2} />
    }

    if (weights.data === undefined) {
      return (
        <CardError
          error={weights.error}
          isRetrying={weights.isFetching}
          onRetry={() => void weights.refetch()}
        />
      )
    }

    if (latest === null) {
      return (
        <EmptyState
          size="sm"
          icon={<Scale />}
          title="Todavía no registraste tu peso"
          description="Cargá tu primer registro con la fecha y el peso."
          action={<TextLink to={paths.progress}>Registrar peso</TextLink>}
        />
      )
    }

    return (
      <div className="flex flex-col gap-1">
        <p className="text-3xl font-semibold tabular-nums">
          {formatWeightKg(latest.weightKg)}
        </p>
        <p className="text-muted-foreground text-sm">
          Registrado el {formatIsoDate(latest.date)}
        </p>
        {latest.comment && (
          <p className="text-sm break-words">{latest.comment}</p>
        )}
      </div>
    )
  }

  return (
    <Card
      aria-labelledby={TITLE_ID}
      aria-busy={weights.isPending}
      className={cn('flex flex-col gap-4', className)}
    >
      <DashboardCardHeader
        id={TITLE_ID}
        title="Último peso"
        icon={<Scale />}
        action={<TextLink to={paths.progress}>Ver progreso</TextLink>}
      />
      {content()}
    </Card>
  )
}
