import { useMemo } from 'react'
import { isApiError } from '../../../lib/api'
import { useBodyMeasurementTypes } from '../../../lib/body-measurements'
import { OutlineButton } from '../../../ui/button'
import { Callout } from '../../../ui/callout'
import { Card } from '../../../ui/card'
import { EmptyState } from '../../../ui/empty-state'
import { IconChip } from '../../../ui/icon-chip'
import { ChartLine, RotateCw } from '../../../ui/icons'
import { Skeleton } from '../../../ui/skeleton'
import { EVOLUTION_HEADING_ID, WEIGHT_KG_FIELD_ID } from '../element-ids'
import { MEASUREMENT_ENTRY_HEADING_ID } from '../body-measurement-element-ids'
import { measurementFields } from '../body-measurement-fields'
import {
  evolutionMetricOptions,
  measurementChartMetric,
  resolveEvolutionMetric,
  WEIGHT_METRIC_KEY,
} from '../body-measurement-evolution'
import { useBodyMeasurementEvolution } from '../hooks/use-body-measurement-evolution'
import { useEvolutionMetric } from '../hooks/use-evolution-metric'
import { useLatestBodyMeasurements } from '../hooks/use-latest-body-measurements'
import { useLatestWeights } from '../hooks/use-latest-weights'
import { useWeightEvolution } from '../hooks/use-weight-evolution'
import { useWeightRange } from '../hooks/use-weight-range'
import { presetOf, validateRange } from '../weight-range'
import { WEIGHT_CHART_METRIC } from '../weight-chart-scale'
import { WeightChart } from './WeightChart'
import { WeightRangeControls } from './WeightRangeControls'
import { EvolutionMetricSelect } from './EvolutionMetricSelect'

type WeightEvolutionCardProps = {
  athleteId: string
  // hoy en la zona de la app: base de los atajos del rango
  today: string
  // US-30: vista del entrenador, sin el atajo a cargar el peso (eso lo hace el atleta)
  readOnly?: boolean
}

// un 400 lo explica el backend (p. ej. "desde" posterior a "hasta"): se muestra su texto
const evolutionErrorMessage = (error: unknown) => {
  if (!isApiError(error))
    return 'Ocurrió un error inesperado. Intentá nuevamente.'
  if (error.status === 400)
    return error.fieldErrors[0]?.message ?? error.message
  return error.message
}

// evolución del peso (US-29) y, desde US-45, de cada medida corporal: gráfico del rango elegido,
// su selector de medida y el de rango, con sus estados. Sin medida elegida, el peso
export function WeightEvolutionCard({
  athleteId,
  today,
  readOnly = false,
}: WeightEvolutionCardProps) {
  const { range, setRange } = useWeightRange()
  const { metric, setMetric } = useEvolutionMetric()
  const rangeError = validateRange(range)
  const activeRange = rangeError ? null : range
  const preset = presetOf(range, today)

  // US-45: el catálogo define las medidas del selector. Si no llega, queda solo el peso
  const measurementTypes = useBodyMeasurementTypes()
  const fields = useMemo(
    () =>
      measurementTypes.data ? measurementFields(measurementTypes.data) : [],
    [measurementTypes.data],
  )
  const selectedField = resolveEvolutionMetric(metric, fields) ?? null
  // la métrica de la URL todavía no se conoce (catálogo en carga): no se dibuja nada distinto
  const metricPending =
    metric !== WEIGHT_METRIC_KEY && !selectedField && measurementTypes.isPending
  const isWeight = selectedField === null

  // las dos evoluciones se llaman siempre (reglas de hooks); solo una pide datos
  const weightEvolution = useWeightEvolution(
    athleteId,
    isWeight ? activeRange : null,
  )
  const measurementEvolution = useBodyMeasurementEvolution(
    athleteId,
    isWeight ? null : activeRange,
    selectedField,
  )
  const evolution = isWeight ? weightEvolution : measurementEvolution

  // sabe si el atleta tiene algún registro, para distinguir "sin datos" de "no hay en este rango"
  const latestWeights = useLatestWeights(athleteId)
  const latestMeasurements = useLatestBodyMeasurements(athleteId)
  const latest = isWeight ? latestWeights : latestMeasurements
  const hasAnyRecord = latest.data ? latest.data.totalElements > 0 : undefined

  const chartMetric = selectedField
    ? measurementChartMetric(selectedField)
    : WEIGHT_CHART_METRIC

  const focusWeightField = () =>
    document.getElementById(WEIGHT_KG_FIELD_ID)?.focus()
  const focusMeasurementCard = () =>
    document.getElementById(MEASUREMENT_ENTRY_HEADING_ID)?.focus()

  const subject = isWeight ? 'peso' : (selectedField?.label.toLowerCase() ?? '')
  const loadingLabel = isWeight
    ? 'Cargando la evolución del peso'
    : `Cargando la evolución de ${subject}`
  const subjectLabel = readOnly
    ? isWeight
      ? 'El peso del atleta'
      : 'La medida del atleta'
    : isWeight
      ? 'Tu peso'
      : 'Tu medida'

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

    if (
      evolution.isPending ||
      latest.isPending ||
      metricPending ||
      !evolution.points
    ) {
      return (
        <div
          role="status"
          aria-label={loadingLabel}
          className="flex flex-col gap-3"
        >
          <Skeleton className="h-60 w-full motion-reduce:animate-none" />
        </div>
      )
    }

    const points = evolution.points
    if (points.length === 0) {
      if (hasAnyRecord === false && readOnly) {
        return (
          <EmptyState
            size="sm"
            icon={<ChartLine />}
            title={
              isWeight
                ? 'El atleta todavía no registró su peso'
                : 'El atleta todavía no registró medidas'
            }
            description={
              isWeight
                ? 'Cuando cargue su peso vas a ver su evolución acá.'
                : 'Cuando cargue sus medidas vas a ver su evolución acá.'
            }
          />
        )
      }
      if (hasAnyRecord === false) {
        return isWeight ? (
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
            title="Todavía no hay datos para graficar"
            description="Cargá tus medidas y vas a ver su evolución acá."
            action={
              <OutlineButton size="sm" onClick={focusMeasurementCard}>
                Cargar mis medidas
              </OutlineButton>
            }
          />
        )
      }
      return (
        <EmptyState
          size="sm"
          icon={<ChartLine />}
          title="No hay registros en este rango"
          description={
            isWeight
              ? 'Probá con otro rango de fechas.'
              : `No hay registros de ${subject} en este rango. Probá con otro rango de fechas.`
          }
        />
      )
    }

    return <WeightChart points={points} metric={chartMetric} />
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
            {chartMetric.title}
          </h2>
          <p className="text-muted-foreground text-sm">
            {subjectLabel} en el rango que elijas. Pasá el cursor sobre un punto
            para ver su valor.
          </p>
        </div>
      </div>

      {fields.length > 0 && (
        <EvolutionMetricSelect
          value={selectedField?.key ?? WEIGHT_METRIC_KEY}
          options={evolutionMetricOptions(fields)}
          onChange={setMetric}
        />
      )}

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
