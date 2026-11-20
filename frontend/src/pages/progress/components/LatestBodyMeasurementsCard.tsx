import { cn } from '../../../lib/cn'
import { isApiError } from '../../../lib/api'
import {
  formatBodyMeasurementValue,
  type BodyMeasurementRecord,
  type BodyMeasurementSide,
} from '../../../lib/body-measurements'
import { formatIsoDate } from '../../../lib/iso-date'
import { Badge } from '../../../ui/badge'
import { OutlineButton } from '../../../ui/button'
import { Callout } from '../../../ui/callout'
import { Card } from '../../../ui/card'
import { EmptyState } from '../../../ui/empty-state'
import { IconChip } from '../../../ui/icon-chip'
import { History, Pencil, Ruler, RotateCw } from '../../../ui/icons'
import { Skeleton } from '../../../ui/skeleton'
import {
  MEASUREMENT_LATEST_HEADING_ID,
  measurementEditButtonId,
} from '../body-measurement-element-ids'
import { fieldKey, type MeasurementField } from '../body-measurement-fields'

type LatestBodyMeasurementsCardProps = {
  records: BodyMeasurementRecord[] | undefined
  totalElements: number
  isPending: boolean
  isRefreshing: boolean
  error: Error | null
  onRetry: () => void
  // hoy en la zona de la app: marca el registro del día
  today: string
  // registro abierto en el formulario
  editingId: string | null
  // nombres de las medidas, del catálogo
  fields: MeasurementField[]
  onEdit: (record: BodyMeasurementRecord) => void
}

const SKELETON_ROWS = 3

const summaryOf = (shown: number, total: number) => {
  if (total > shown) return `Los ${shown} más recientes de ${total}`
  return total === 1 ? '1 registro' : `${total} registros`
}

// US-45: los últimos registros de medidas, el más reciente primero, con sus valores y su edición
export function LatestBodyMeasurementsCard({
  records,
  totalElements,
  isPending,
  isRefreshing,
  error,
  onRetry,
  today,
  editingId,
  fields,
  onEdit,
}: LatestBodyMeasurementsCardProps) {
  // la medida de un valor del registro, según el catálogo (nombre y unidad)
  const fieldOf = (type: string, side: BodyMeasurementSide | null) =>
    fields.find((field) => field.key === fieldKey(type, side ?? undefined))

  const content = () => {
    if (error) {
      return (
        <div className="flex flex-col items-start gap-3">
          <Callout tone="danger" className="self-stretch">
            {isApiError(error)
              ? error.message
              : 'Ocurrió un error inesperado. Intentá nuevamente.'}
          </Callout>
          <OutlineButton size="sm" disabled={isRefreshing} onClick={onRetry}>
            <RotateCw aria-hidden="true" />
            {isRefreshing ? 'Reintentando...' : 'Reintentar'}
          </OutlineButton>
        </div>
      )
    }

    if (isPending || !records) {
      return (
        <div role="status" aria-label="Cargando registros de medidas">
          {Array.from({ length: SKELETON_ROWS }, (_, index) => (
            <div
              key={index}
              className="border-border-subtle flex flex-col gap-2 border-b py-4 last:border-b-0"
            >
              <Skeleton className="h-6 w-24 motion-reduce:animate-none" />
              <Skeleton className="h-4 w-full motion-reduce:animate-none" />
            </div>
          ))}
        </div>
      )
    }

    if (records.length === 0) {
      return (
        <EmptyState
          size="sm"
          icon={<Ruler />}
          title="Todavía no registraste medidas"
          description="Cargá tu primer registro con la fecha y las medidas que tomes: lo vas a ver acá."
        />
      )
    }

    return (
      <ul
        aria-labelledby={MEASUREMENT_LATEST_HEADING_ID}
        aria-busy={isRefreshing}
      >
        {records.map((record) => {
          const day = formatIsoDate(record.date)
          const isEditing = record.id === editingId
          return (
            <li
              key={record.id}
              className={cn(
                'border-border-subtle flex items-start gap-4 border-b py-4 last:border-b-0',
                // borde y no fondo: el texto secundario mantiene el contraste sobre blanco
                isEditing && 'border-l-primary border-l-[3px] pl-3',
              )}
            >
              <div className="flex min-w-0 flex-1 flex-col gap-2">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <time
                    dateTime={record.date}
                    className="font-bold tracking-tight"
                  >
                    {day}
                  </time>
                  {record.date === today && <Badge>Hoy</Badge>}
                </div>
                <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
                  {record.values.map((value) => {
                    const field = fieldOf(value.type, value.side)
                    return (
                      <li
                        key={fieldKey(value.type, value.side ?? undefined)}
                        className="flex flex-wrap gap-x-1.5"
                      >
                        <span className="text-muted-foreground">
                          {field?.label ?? value.type}
                        </span>
                        <span className="font-semibold tabular-nums">
                          {formatBodyMeasurementValue(
                            value.value,
                            field?.unit ?? '',
                          )}
                        </span>
                      </li>
                    )
                  })}
                </ul>
                {record.comment && (
                  <p className="text-sm break-words whitespace-pre-line">
                    {record.comment}
                  </p>
                )}
              </div>
              {isEditing ? (
                <span className="text-primary flex h-10 shrink-0 items-center gap-1.5 text-sm font-semibold [&_svg]:size-4">
                  <Pencil aria-hidden="true" /> Editando
                </span>
              ) : (
                <OutlineButton
                  id={measurementEditButtonId(record.id)}
                  size="sm"
                  className="shrink-0"
                  onClick={() => onEdit(record)}
                >
                  <Pencil aria-hidden="true" />
                  Editar <span className="sr-only">las medidas del {day}</span>
                </OutlineButton>
              )}
            </li>
          )
        })}
      </ul>
    )
  }

  return (
    <Card
      aria-labelledby={MEASUREMENT_LATEST_HEADING_ID}
      className="flex flex-col gap-1"
    >
      <div className="border-border-subtle flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b pb-4">
        <div className="flex items-center gap-3">
          <IconChip shape="square" size="sm">
            <History />
          </IconChip>
          <h2
            id={MEASUREMENT_LATEST_HEADING_ID}
            className="text-lg font-semibold sm:text-xl"
          >
            Últimas medidas
          </h2>
        </div>
        {records && records.length > 0 && !error && (
          <p className="text-muted-foreground text-sm">
            {summaryOf(records.length, totalElements)}
          </p>
        )}
      </div>
      {content()}
    </Card>
  )
}
