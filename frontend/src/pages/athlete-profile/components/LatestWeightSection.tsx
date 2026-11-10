import { isApiError } from '../../../lib/api'
import { formatIsoDate } from '../../../lib/iso-date'
import { formatWeightKg } from '../../../lib/weights'
import { athleteEditPath } from '../../../router/paths'
import { OutlineButton } from '../../../ui/button'
import { Callout } from '../../../ui/callout'
import { SectionCard } from '../../../ui/card'
import { EmptyState } from '../../../ui/empty-state'
import { RotateCw, Scale, Weight } from '../../../ui/icons'
import { Skeleton } from '../../../ui/skeleton'
import { TextLink } from '../../../ui/text-link'
import { useLatestWeight } from '../hooks/use-latest-weight'

type LatestWeightSectionProps = {
  athleteId: string
  // respaldo cuando el atleta todavía no registró su peso
  initialWeightKg: number | null
}

const TITLE = 'Último peso'

// último registro de peso del atleta (US-26); sin registros, el peso inicial rotulado como tal.
// Carga y error propios: si falla solo esta llamada, el resto de la ficha se ve igual
export function LatestWeightSection({
  athleteId,
  initialWeightKg,
}: LatestWeightSectionProps) {
  const { data, error, isPending, isFetching, refetch } =
    useLatestWeight(athleteId)

  const content = () => {
    if (error) {
      return (
        <div className="flex flex-col items-start gap-3">
          <Callout tone="danger" className="self-stretch">
            No se pudo cargar el último peso.{' '}
            {isApiError(error) ? error.message : ''}
          </Callout>
          <OutlineButton
            size="sm"
            disabled={isFetching}
            onClick={() => void refetch()}
          >
            <RotateCw aria-hidden="true" />
            {isFetching ? 'Reintentando...' : 'Reintentar'}
          </OutlineButton>
        </div>
      )
    }

    if (isPending) {
      return (
        <div
          role="status"
          aria-label="Cargando último peso"
          className="flex flex-col gap-2"
        >
          <Skeleton className="h-4 w-28 motion-reduce:animate-none" />
          <Skeleton className="h-9 w-32 motion-reduce:animate-none" />
          <Skeleton className="h-4 w-48 motion-reduce:animate-none" />
        </div>
      )
    }

    const latest = data.content[0]
    if (latest) {
      return (
        <div className="flex flex-col gap-2">
          <dl className="flex flex-col gap-1">
            <dt className="text-muted-foreground text-sm">Último registro</dt>
            <dd className="text-3xl font-bold tracking-tight">
              {formatWeightKg(latest.weightKg)}
            </dd>
          </dl>
          <p className="text-muted-foreground text-sm">
            Registrado el{' '}
            <time dateTime={latest.date}>{formatIsoDate(latest.date)}</time>.
          </p>
          {latest.comment && (
            <p className="text-sm break-words whitespace-pre-line">
              {latest.comment}
            </p>
          )}
        </div>
      )
    }

    if (initialWeightKg !== null) {
      return (
        <div className="flex flex-col gap-2">
          <dl className="flex flex-col gap-1">
            <dt className="text-muted-foreground text-sm">Peso inicial</dt>
            <dd className="text-3xl font-bold tracking-tight">
              {formatWeightKg(initialWeightKg)}
            </dd>
          </dl>
          <p className="text-muted-foreground text-sm">
            Cargado en el alta. Todavía no hay registros posteriores.
          </p>
        </div>
      )
    }

    return (
      <EmptyState
        size="sm"
        icon={<Weight />}
        title="Sin registros de peso"
        description="Todavía no se cargó su peso inicial."
        action={
          <TextLink to={athleteEditPath(athleteId)}>
            Cargar peso inicial
          </TextLink>
        }
      />
    )
  }

  return (
    <SectionCard title={TITLE} icon={<Scale />} aria-label={TITLE}>
      {content()}
    </SectionCard>
  )
}
