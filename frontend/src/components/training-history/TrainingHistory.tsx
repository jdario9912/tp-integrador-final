import { useState, type ReactNode } from 'react'
import {
  useTrainingHistory,
  validateHistoryRange,
  type TrainingHistoryQuery,
  type TrainingSession,
} from '../../lib/training-sessions'
import { HistoryFilter } from './HistoryFilter'
import { EMPTY_RANGE, type DateRange } from './date-range'
import { HistoryList } from './HistoryList'
import { SessionDetail } from './SessionDetail'

// el historial se pagina de a 10 (contrato 25: size por defecto 20; la pantalla usa 10)
export const HISTORY_PAGE_SIZE = 10

export type TrainingHistoryProps = {
  athleteId: string
  // lo que se muestra debajo del detalle de la sesión: la observación del entrenador (atleta) o el
  // formulario de revisión (entrenador). Recibe la sesión con su detalle ya cargado
  renderReview: (session: TrainingSession) => ReactNode
  // texto del estado vacío sin filtros
  emptyDescription: string
}

// historial de sesiones cerradas, compartido por la pantalla del atleta y la sección del perfil del
// entrenador (US-21). El rango que se consulta es el último válido: un rango incompleto o inválido
// no dispara un pedido y el aviso queda debajo de los campos
export function TrainingHistory({
  athleteId,
  renderReview,
  emptyDescription,
}: TrainingHistoryProps) {
  const [draft, setDraft] = useState<DateRange>(EMPTY_RANGE)
  const [applied, setApplied] = useState<DateRange>(EMPTY_RANGE)
  const [page, setPage] = useState(1)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const rangeError = validateHistoryRange(draft.from, draft.to)

  const changeRange = (next: DateRange) => {
    setDraft(next)
    if (!validateHistoryRange(next.from, next.to)) {
      setApplied(next)
      setPage(1)
    }
  }

  const query: TrainingHistoryQuery = {
    from: applied.from || undefined,
    to: applied.to || undefined,
    page: page - 1,
    size: HISTORY_PAGE_SIZE,
  }
  const history = useTrainingHistory(athleteId, query)
  const filtered = Boolean(applied.from || applied.to)

  return (
    <div className="flex flex-col gap-6">
      <HistoryFilter value={draft} onChange={changeRange} error={rangeError} />
      <HistoryList
        history={history}
        page={page}
        onPageChange={setPage}
        selectedId={selectedId}
        onSelect={setSelectedId}
        filtered={filtered}
        emptyDescription={emptyDescription}
        onRetry={() => void history.refetch()}
      />
      {/* con key: cambiar de sesión monta el detalle de nuevo, y así pide su propio dato y mueve el
          foco al encabezado del detalle */}
      {selectedId && (
        <SessionDetail
          key={selectedId}
          athleteId={athleteId}
          sessionId={selectedId}
          renderReview={renderReview}
        />
      )}
    </div>
  )
}
