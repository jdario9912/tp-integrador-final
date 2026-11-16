import type { UseQueryResult } from '@tanstack/react-query'
import { cn } from '../../lib/cn'
import { isApiError, type PageResponse } from '../../lib/api'
import {
  formatCompletion,
  formatDayLabel,
  historyStatusLabels,
  type TrainingHistoryItem,
} from '../../lib/training-sessions'
import { formatIsoDate } from '../../lib/iso-date'
import { Badge } from '../../ui/badge'
import { OutlineButton } from '../../ui/button'
import { Callout } from '../../ui/callout'
import { EmptyState } from '../../ui/empty-state'
import { ChevronRight, ClipboardCheck, RotateCw } from '../../ui/icons'
import { Pagination } from '../../ui/pagination'
import { Skeleton } from '../../ui/skeleton'

type HistoryListProps = {
  history: UseQueryResult<PageResponse<TrainingHistoryItem>, Error>
  // desde 1, como la ve el usuario
  page: number
  onPageChange: (page: number) => void
  selectedId: string | null
  onSelect: (sessionId: string) => void
  // hay un rango de fechas aplicado: el estado vacío lo dice
  filtered: boolean
  emptyDescription: string
  onRetry: () => void
}

const SKELETON_ROWS = 3

const formatCount = (count: number) =>
  count === 1 ? '1 entrenamiento' : `${count} entrenamientos`

// una fila del historial: fecha, estado, día y cumplimiento. Es un botón para abrir el detalle, así
// se usa con teclado y con lector de pantalla sin ARIA extra
function HistoryRow({
  item,
  selected,
  onSelect,
}: {
  item: TrainingHistoryItem
  selected: boolean
  onSelect: (sessionId: string) => void
}) {
  return (
    <li className="border-border-subtle border-b last:border-b-0">
      <button
        type="button"
        aria-current={selected ? 'true' : undefined}
        onClick={() => onSelect(item.id)}
        className={cn(
          'focus-visible:ring-ring flex w-full items-center gap-4 rounded-control px-3 py-4 text-left transition-colors focus-visible:ring-2 focus-visible:outline-none',
          selected ? 'bg-primary-soft' : 'hover:bg-muted',
        )}
      >
        <span className="flex min-w-0 flex-1 flex-col gap-1.5">
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
            <time dateTime={item.sessionDate} className="font-semibold">
              {formatIsoDate(item.sessionDate)}
            </time>
            <Badge
              tone={item.status === 'FINISHED' ? 'success' : 'neutral'}
              dot
            >
              {historyStatusLabels[item.status]}
            </Badge>
            {item.review && <Badge tone="info">Revisada</Badge>}
          </span>
          <span className="text-sm break-words">
            {formatDayLabel(item)} · {item.routineName}
          </span>
          <span className="text-muted-foreground text-sm tabular-nums">
            {formatCompletion(item.summary)}
          </span>
        </span>
        <ChevronRight
          aria-hidden="true"
          className="text-subtle-foreground size-5 shrink-0"
        />
      </button>
    </li>
  )
}

// el historial paginado: lista, estados de carga, error y vacío, y la paginación
export function HistoryList({
  history,
  page,
  onPageChange,
  selectedId,
  onSelect,
  filtered,
  emptyDescription,
  onRetry,
}: HistoryListProps) {
  const { data, error, isPending, isFetching, isPlaceholderData } = history

  if (error) {
    return (
      <div className="flex flex-col items-start gap-3">
        <Callout tone="danger" className="self-stretch">
          No se pudo cargar el historial de entrenamientos.{' '}
          {isApiError(error) ? error.message : ''}
        </Callout>
        <OutlineButton size="sm" disabled={isFetching} onClick={onRetry}>
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
        aria-label="Cargando entrenamientos"
        className="flex flex-col gap-3"
      >
        {Array.from({ length: SKELETON_ROWS }, (_, index) => (
          <Skeleton key={index} className="h-20 motion-reduce:animate-none" />
        ))}
      </div>
    )
  }

  if (data.content.length === 0) {
    return (
      <EmptyState
        size="sm"
        icon={<ClipboardCheck />}
        title={
          filtered
            ? 'Sin entrenamientos en ese rango'
            : 'Todavía no hay entrenamientos cerrados'
        }
        description={
          filtered
            ? 'Probá con otras fechas o quitá el filtro.'
            : emptyDescription
        }
      />
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <ul
        aria-label="Entrenamientos cerrados"
        aria-busy={isPlaceholderData}
        className={cn(isPlaceholderData && 'opacity-60 transition-opacity')}
      >
        {data.content.map((item) => (
          <HistoryRow
            key={item.id}
            item={item}
            selected={item.id === selectedId}
            onSelect={onSelect}
          />
        ))}
      </ul>
      <Pagination
        page={page}
        totalPages={data.totalPages}
        onPageChange={onPageChange}
        summary={formatCount(data.totalElements)}
        disabled={isPlaceholderData}
      />
    </div>
  )
}
