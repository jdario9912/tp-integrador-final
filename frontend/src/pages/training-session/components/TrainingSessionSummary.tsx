import type { TrainingSession } from '../../../lib/training-sessions'
import { Clock } from '../../../ui/icons'
import { formatStartedAt } from '../training-session-format'

type TrainingSessionSummaryProps = {
  session: TrainingSession
  // hoy en la zona de la app, YYYY-MM-DD
  today: string
}

// debajo del título, como el resumen de Mi rutina: qué rutina es y cuándo empezó
export function TrainingSessionSummary({
  session,
  today,
}: TrainingSessionSummaryProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-foreground text-lg font-semibold break-words">
        {session.routineName}
      </p>
      <p className="inline-flex items-center gap-1.5 text-sm [&_svg]:size-4 [&_svg]:shrink-0">
        <Clock aria-hidden="true" />
        {formatStartedAt(session, today)}
      </p>
    </div>
  )
}
