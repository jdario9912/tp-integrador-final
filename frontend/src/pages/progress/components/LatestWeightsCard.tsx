import { isApiError } from '../../../lib/api'
import type { WeightRecord } from '../../../lib/weights'
import { OutlineButton } from '../../../ui/button'
import { Callout } from '../../../ui/callout'
import { Card } from '../../../ui/card'
import { EmptyState } from '../../../ui/empty-state'
import { IconChip } from '../../../ui/icon-chip'
import { History, RotateCw, Weight } from '../../../ui/icons'
import { Skeleton } from '../../../ui/skeleton'
import { LATEST_HEADING_ID } from '../element-ids'
import { WeightRecordItem } from './WeightRecordItem'

type LatestWeightsCardProps = {
  records: WeightRecord[] | undefined
  totalElements: number
  // primera carga, todavía sin datos
  isPending: boolean
  // se muestran los datos anteriores mientras llegan los nuevos
  isRefreshing: boolean
  error: Error | null
  onRetry: () => void
  // hoy en la zona de la app: marca el registro del día
  today: string
  // registro abierto en el formulario
  editingId: string | null
  onEdit: (record: WeightRecord) => void
}

const SKELETON_ROWS = 3

const summaryOf = (shown: number, total: number) => {
  if (total > shown) return `Los ${shown} más recientes de ${total}`
  return total === 1 ? '1 registro' : `${total} registros`
}

// los últimos registros del atleta, el más reciente primero
export function LatestWeightsCard({
  records,
  totalElements,
  isPending,
  isRefreshing,
  error,
  onRetry,
  today,
  editingId,
  onEdit,
}: LatestWeightsCardProps) {
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
        <div role="status" aria-label="Cargando registros de peso">
          {Array.from({ length: SKELETON_ROWS }, (_, index) => (
            <div
              key={index}
              className="border-border-subtle flex items-center gap-4 border-b py-4 last:border-b-0"
            >
              <div className="flex flex-1 flex-col gap-2">
                <Skeleton className="h-6 w-24 motion-reduce:animate-none" />
                <Skeleton className="h-4 w-44 motion-reduce:animate-none" />
              </div>
              <Skeleton className="h-10 w-24 motion-reduce:animate-none" />
            </div>
          ))}
        </div>
      )
    }

    if (records.length === 0) {
      return (
        <EmptyState
          size="sm"
          icon={<Weight />}
          title="Todavía no registraste tu peso"
          description="Cargá tu primer registro con la fecha y el peso: lo vas a ver acá."
        />
      )
    }

    return (
      <ul aria-labelledby={LATEST_HEADING_ID} aria-busy={isRefreshing}>
        {records.map((record) => (
          <WeightRecordItem
            key={record.id}
            record={record}
            isToday={record.date === today}
            isEditing={record.id === editingId}
            onEdit={onEdit}
          />
        ))}
      </ul>
    )
  }

  return (
    <Card aria-labelledby={LATEST_HEADING_ID} className="flex flex-col gap-1">
      <div className="border-border-subtle flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b pb-4">
        <div className="flex items-center gap-3">
          <IconChip shape="square" size="sm">
            <History />
          </IconChip>
          <h2
            id={LATEST_HEADING_ID}
            className="text-lg font-semibold sm:text-xl"
          >
            Últimos registros
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
