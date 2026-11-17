import { isApiError } from '../../../lib/api'
import { OutlineButton } from '../../../ui/button'
import { Callout } from '../../../ui/callout'
import { Card } from '../../../ui/card'
import { EmptyState } from '../../../ui/empty-state'
import { IconChip } from '../../../ui/icon-chip'
import { ChartLine, RotateCw } from '../../../ui/icons'
import { Skeleton } from '../../../ui/skeleton'
import { EVOLUTION_HEADING_ID, WEIGHT_KG_FIELD_ID } from '../element-ids'
import { useLatestWeights } from '../hooks/use-latest-weights'
import { useWeightEvolution } from '../hooks/use-weight-evolution'
import { useWeightRange } from '../hooks/use-weight-range'
import { presetOf, validateRange } from '../weight-range'
import { WeightChart } from './WeightChart'
import { WeightRangeControls } from './WeightRangeControls'

type WeightEvolutionCardProps = {
  athleteId: string
  // hoy en la zona de la app: base de los atajos del rango
  today: string
}

// un 400 lo explica el backend (p. ej. "desde" posterior a "hasta"): se muestra su texto
const evolutionErrorMessage = (error: unknown) => {
  if (!isApiError(error))
    return 'Ocurrió un error inesperado. Intentá nuevamente.'
  if (error.status === 400)
    return error.fieldErrors[0]?.message ?? error.message
  return error.message
}

// evolución del peso (US-29): gráfico del rango elegido y su selector, con sus estados
export function WeightEvolutionCard({
  athleteId,
  today,
}: WeightEvolutionCardProps) {
  const { range, setRange } = useWeightRange()
  const rangeError = validateRange(range)
  const latest = useLatestWeights(athleteId)
  // un rango inválido no llega a la API: lo muestra la tarjeta
  const evolution = useWeightEvolution(athleteId, rangeError ? null : range)
  const preset = presetOf(range, today)
  // sabe si el atleta tiene algún registro, para distinguir "sin datos" de "no hay en este rango"
  const hasAnyRecord = latest.data ? latest.data.totalElements > 0 : undefined

  const focusWeightField = () =>
    document.getElementById(WEIGHT_KG_FIELD_ID)?.focus()

  const content = () => {
    if (rangeError) {
      return <Callout tone="danger">{rangeError.message}.</Callout>
    }

    if (evolution.error) {
      const isBadRequest =
        isApiError(evolution.error) && evolution.error.status === 400
      return (
        <div className="flex flex-col items-start gap-3">
          <Callout tone="danger" className="self-stretch">
            {evolutionErrorMessage(evolution.error)}
          </Callout>
          {!isBadRequest && (
            <OutlineButton size="sm" onClick={() => void evolution.refetch()}>
              <RotateCw aria-hidden="true" />
              Reintentar
            </OutlineButton>
          )}
        </div>
      )
    }

    if (evolution.isPending || latest.isPending || !evolution.points) {
      return (
        <div
          role="status"
          aria-label="Cargando la evolución del peso"
          className="flex flex-col gap-3"
        >
          <Skeleton className="h-60 w-full motion-reduce:animate-none" />
        </div>
      )
    }

    const points = evolution.points
    if (points.length === 0) {
      return hasAnyRecord === false ? (
        <EmptyState
          size="sm"
          icon={<ChartLine />}
          title="Todavía no hay datos para graficar"
          description="Cargá tu peso y vas a ver tu evolución acá."
          action={
            <OutlineButton size="sm" onClick={focusWeightField}>
              Cargar mi peso
            </OutlineButton>
          }
        />
      ) : (
        <EmptyState
          size="sm"
          icon={<ChartLine />}
          title="No hay registros en este rango"
          description="Probá con otro rango de fechas."
        />
      )
    }

    return <WeightChart points={points} />
  }

  return (
    <Card
      aria-labelledby={EVOLUTION_HEADING_ID}
      className="flex flex-col gap-5"
    >
      <div className="border-border-subtle flex items-start gap-3 border-b pb-4">
        <IconChip shape="square" size="sm">
          <ChartLine />
        </IconChip>
        <div className="flex min-w-0 flex-col gap-1">
          <h2
            id={EVOLUTION_HEADING_ID}
            className="text-lg font-semibold sm:text-xl"
          >
            Evolución del peso
          </h2>
          <p className="text-muted-foreground text-sm">
            Tu peso en el rango que elijas. Pasá el cursor sobre un punto para
            ver su valor.
          </p>
        </div>
      </div>

      <WeightRangeControls
        range={range}
        preset={preset}
        today={today}
        onChange={setRange}
      />

      {content()}
    </Card>
  )
}
