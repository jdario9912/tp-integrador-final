import { useEffect, useRef } from 'react'
import { isApiError } from '../../../lib/api'
import { useNavigate } from '../../../lib/navigation'
import type { TrainingSession } from '../../../lib/training-sessions'
import { trainingPath } from '../../../router/paths'
import { OutlineButton, PrimaryButton } from '../../../ui/button'
import { Callout } from '../../../ui/callout'
import { IconChip } from '../../../ui/icon-chip'
import { Activity, PlayCircle, RotateCw } from '../../../ui/icons'
import { dayTitle, formatInProgressSince } from '../my-routine-format'

type InProgressNoticeProps = {
  // la sesión en progreso; null si no hay (o, después de un 409, si todavía no se sabe cuál es)
  session: TrainingSession | null
  // el último intento de iniciar respondió 409: ya había una en curso
  conflict: boolean
  // estado de la consulta de la sesión en progreso
  isFetching: boolean
  error: Error | null
  onRetry: () => void
  // hoy en la zona de la app, YYYY-MM-DD
  today: string
}

const HEADING_ID = 'in-progress-training-heading'

// CA-2 y CE-1: el entrenamiento en curso se retoma desde acá y, mientras exista, no se ofrece
// iniciar otro. Después de un 409 recibe el foco: el botón Iniciar desaparece y el aviso explica por qué
export function InProgressNotice({
  session,
  conflict,
  isFetching,
  error,
  onRetry,
  today,
}: InProgressNoticeProps) {
  const navigate = useNavigate()
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (conflict) ref.current?.focus()
  }, [conflict])

  const content = () => {
    if (session) {
      const since = `${dayTitle(session.day)}, ${formatInProgressSince(session, today)}.`
      return (
        <section
          aria-labelledby={HEADING_ID}
          className="rounded-card border-primary-soft-strong bg-primary-soft flex flex-col gap-4 border p-4 sm:flex-row sm:items-center sm:p-5"
        >
          <div className="flex min-w-0 flex-1 items-start gap-3 sm:items-center">
            <IconChip size="md" className="bg-surface">
              <Activity />
            </IconChip>
            <div className="flex min-w-0 flex-col gap-0.5">
              <h2 id={HEADING_ID} className="text-base font-semibold">
                {conflict
                  ? 'Ya tenés un entrenamiento en curso'
                  : 'Tenés un entrenamiento en curso'}
              </h2>
              {/* texto principal y no muted: sobre primary-soft el muted no llega a AA */}
              <p className="text-sm break-words">
                {since}
                {conflict && ' Retomalo para continuar.'}
              </p>
            </div>
          </div>
          <PrimaryButton
            className="w-full sm:w-auto"
            onClick={() => navigate(trainingPath(session.id))}
          >
            <PlayCircle aria-hidden="true" /> Retomar
          </PrimaryButton>
        </section>
      )
    }

    // 409 y la consulta todavía no trajo la sesión: se busca o se reintenta
    if (isFetching || error) {
      return (
        <Callout tone="warning" title="Ya tenés un entrenamiento en curso.">
          {error && !isFetching
            ? `No se pudo traer para retomarlo. ${isApiError(error) ? error.message : ''}`
            : 'Lo estamos buscando para que lo retomes.'}
          <span className="mt-3 flex">
            <OutlineButton size="sm" disabled={isFetching} onClick={onRetry}>
              <RotateCw aria-hidden="true" />
              {isFetching ? 'Buscando…' : 'Reintentar'}
            </OutlineButton>
          </span>
        </Callout>
      )
    }

    // 409 y ya no hay ninguna en progreso (se finalizó en otro lado): se puede volver a iniciar
    return (
      <Callout tone="info">
        Tu entrenamiento anterior ya no está en curso. Podés iniciar uno nuevo.
      </Callout>
    )
  }

  return (
    <div
      ref={ref}
      tabIndex={-1}
      className="rounded-card focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none"
    >
      {content()}
    </div>
  )
}
