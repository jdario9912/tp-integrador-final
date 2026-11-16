import { useEffect, useId, useRef, type ReactNode } from 'react'
import { isApiError } from '../../lib/api'
import { formatIsoDate } from '../../lib/iso-date'
import {
  formatDuration,
  historyStatusLabels,
  useTrainingSession,
  type TrainingSession,
} from '../../lib/training-sessions'
import { Badge } from '../../ui/badge'
import { OutlineButton } from '../../ui/button'
import { Callout } from '../../ui/callout'
import { Card } from '../../ui/card'
import { DescriptionItem, DescriptionList } from '../../ui/description-list'
import { RotateCw } from '../../ui/icons'
import { Skeleton } from '../../ui/skeleton'
import { formatWeight } from '../../lib/routines'
import { SessionSetsList } from './SessionSetsList'

type SessionDetailProps = {
  athleteId: string
  sessionId: string
  renderReview: (session: TrainingSession) => ReactNode
}

// el historial solo trae sesiones cerradas; En progreso queda por si el detalle se pide igual
const statusLabel = (status: TrainingSession['status']) =>
  status === 'IN_PROGRESS' ? 'En progreso' : historyStatusLabels[status]

// detalle de una sesión cerrada: resumen, series por ejercicio y la revisión (la del entrenador o
// la observación que ve el atleta). Lo pide al abrirse, así siempre muestra el día tal como está
export function SessionDetail({
  athleteId,
  sessionId,
  renderReview,
}: SessionDetailProps) {
  const headingId = useId()
  const headingRef = useRef<HTMLHeadingElement>(null)
  const {
    data: session,
    error,
    isPending,
    isFetching,
    refetch,
  } = useTrainingSession(athleteId, sessionId)

  // al abrir una sesión el foco va a su encabezado: quien usa teclado o lector lo oye sin buscarlo
  useEffect(() => {
    headingRef.current?.focus()
  }, [])

  const content = () => {
    if (error) {
      // 404: no existe o es de otro atleta. Reintentar no lo cambia
      if (isApiError(error) && error.status === 404) {
        return (
          <Callout tone="danger">
            No existe este entrenamiento o no podés verlo.
          </Callout>
        )
      }
      return (
        <div className="flex flex-col items-start gap-3">
          <Callout tone="danger" className="self-stretch">
            No se pudo cargar el entrenamiento.{' '}
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
          aria-label="Cargando el entrenamiento"
          className="flex flex-col gap-3"
        >
          <Skeleton className="h-6 w-1/2 motion-reduce:animate-none" />
          <Skeleton className="h-24 motion-reduce:animate-none" />
        </div>
      )
    }

    const { summary, startedAt, endedAt, day } = session
    return (
      <>
        <header className="flex flex-col gap-1.5">
          <p className="text-lg font-semibold break-words">
            Día {day.dayNumber} · {day.name}
          </p>
          <p className="text-muted-foreground text-sm break-words">
            {session.routineName}
          </p>
          <p className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm">
            <time dateTime={session.sessionDate}>
              {formatIsoDate(session.sessionDate)}
            </time>
            <Badge
              tone={session.status === 'FINISHED' ? 'success' : 'neutral'}
              dot
            >
              {statusLabel(session.status)}
            </Badge>
          </p>
        </header>
        <DescriptionList className="grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-3">
          <DescriptionItem label="Series hechas">
            {`${summary.doneSets} de ${summary.prescribedSets}`}
          </DescriptionItem>
          <DescriptionItem label="Omitidas">
            {summary.skippedSets}
          </DescriptionItem>
          <DescriptionItem label="Sin registrar">
            {summary.pendingSets}
          </DescriptionItem>
          <DescriptionItem label="Volumen">
            {formatWeight(summary.volumeKg)}
          </DescriptionItem>
          {endedAt && (
            <DescriptionItem label="Duración">
              {formatDuration(startedAt, endedAt)}
            </DescriptionItem>
          )}
        </DescriptionList>
        <SessionSetsList session={session} />
        {renderReview(session)}
      </>
    )
  }

  return (
    <Card
      aria-labelledby={headingId}
      className="scroll-mt-24 flex flex-col gap-6"
    >
      <h2
        ref={headingRef}
        id={headingId}
        tabIndex={-1}
        className="text-lg font-semibold focus:outline-none"
      >
        Detalle del entrenamiento
      </h2>
      {content()}
    </Card>
  )
}
