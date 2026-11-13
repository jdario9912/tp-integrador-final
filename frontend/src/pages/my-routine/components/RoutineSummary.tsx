import type { AthleteRoutine } from '../../../lib/athlete-routine'
import { CalendarCheck, Target } from '../../../ui/icons'
import { formatValidity } from '../my-routine-format'

type RoutineSummaryProps = { athleteRoutine: AthleteRoutine }

// debajo del título de la página: qué rutina es, para qué y hasta cuándo rige
export function RoutineSummary({ athleteRoutine }: RoutineSummaryProps) {
  const { routine } = athleteRoutine

  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-foreground text-lg font-semibold break-words">
        {routine.name}
      </p>
      <p className="flex flex-wrap items-center gap-x-5 gap-y-1 text-sm [&_svg]:size-4 [&_svg]:shrink-0">
        {routine.goal && (
          <span className="inline-flex min-w-0 items-center gap-1.5 break-words">
            <Target aria-hidden="true" />
            Objetivo: {routine.goal}
          </span>
        )}
        <span className="inline-flex items-center gap-1.5">
          <CalendarCheck aria-hidden="true" />
          {formatValidity(athleteRoutine)}
        </span>
      </p>
    </div>
  )
}
