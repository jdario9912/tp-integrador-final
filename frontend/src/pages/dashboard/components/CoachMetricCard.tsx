import type { ReactNode } from 'react'
import type {
  DashboardAthlete,
  DashboardMetric,
} from '../../../lib/coach-dashboard'
import { cn } from '../../../lib/cn'
import { athleteProfilePath } from '../../../router/paths'
import { Avatar } from '../../../ui/avatar'
import { OutlineButton } from '../../../ui/button'
import { Callout } from '../../../ui/callout'
import { Card } from '../../../ui/card'
import { ListItem } from '../../../ui/list-item'
import { RotateCw } from '../../../ui/icons'
import { TextLink } from '../../../ui/text-link'
import { CardSkeleton } from './CardSkeleton'
import { DashboardCardHeader } from './DashboardCardHeader'

type CoachMetricCardProps<TAthlete extends DashboardAthlete> = {
  id: string
  title: string
  icon: ReactNode
  // qué cuenta el número grande
  description: string
  // undefined mientras carga; null si el servidor no pudo calcularla (llega en warnings)
  metric: DashboardMetric<TAthlete> | null | undefined
  // texto cuando la métrica da 0
  emptyMessage: string
  // detalle bajo el nombre de cada atleta (sesiones pendientes, último peso)
  metaOf?: (athlete: TAthlete) => ReactNode
  // con algo para atender, la tarjeta se tiñe (como "Requieren revisión" de la plantilla)
  highlightWhenPositive?: boolean
  isRetrying: boolean
  onRetry: () => void
}

// una métrica del panel del entrenador (US-11): el número y los atletas que la componen, cada uno
// con un link a su ficha. Si esa métrica falló, avisa solo en esta tarjeta
export function CoachMetricCard<TAthlete extends DashboardAthlete>({
  id,
  title,
  icon,
  description,
  metric,
  emptyMessage,
  metaOf,
  highlightWhenPositive = false,
  isRetrying,
  onRetry,
}: CoachMetricCardProps<TAthlete>) {
  const highlighted = highlightWhenPositive && (metric?.count ?? 0) > 0

  const content = () => {
    if (metric === undefined) {
      return <CardSkeleton label={`Cargando ${title.toLowerCase()}`} />
    }

    if (metric === null) {
      return (
        <div className="flex flex-col items-start gap-3">
          <Callout tone="warning" className="self-stretch">
            No pudimos calcular esta métrica. El resto del panel está al día.
          </Callout>
          <OutlineButton size="sm" disabled={isRetrying} onClick={onRetry}>
            <RotateCw aria-hidden="true" />
            {isRetrying ? 'Reintentando…' : 'Reintentar'}
          </OutlineButton>
        </div>
      )
    }

    return (
      <>
        <div className="flex flex-col gap-1">
          <p
            className={cn(
              'text-3xl font-semibold tabular-nums',
              highlighted && 'text-danger',
            )}
          >
            {metric.count}
          </p>
          <p className="text-muted-foreground text-sm">{description}</p>
        </div>
        {metric.athletes.length === 0 ? (
          <p className="text-muted-foreground text-sm">{emptyMessage}</p>
        ) : (
          // una cartera grande no estira la tarjeta: la lista se desplaza
          <ul aria-labelledby={id} className="max-h-72 overflow-y-auto">
            {metric.athletes.map((athlete) => (
              <ListItem
                key={athlete.id}
                className="py-3"
                leading={
                  <Avatar
                    size="xs"
                    firstName={athlete.firstName}
                    lastName={athlete.lastName}
                  />
                }
                title={
                  <TextLink to={athleteProfilePath(athlete.id)}>
                    {athlete.firstName} {athlete.lastName}
                  </TextLink>
                }
                meta={metaOf?.(athlete)}
              />
            ))}
          </ul>
        )}
      </>
    )
  }

  return (
    <Card
      aria-labelledby={id}
      aria-busy={metric === undefined}
      tone={highlighted ? 'danger' : 'default'}
      className="flex flex-col gap-4"
    >
      <DashboardCardHeader id={id} title={title} icon={icon} />
      {content()}
    </Card>
  )
}
