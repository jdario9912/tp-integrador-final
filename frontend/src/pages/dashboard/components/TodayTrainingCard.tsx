import { isApiError } from '../../../lib/api'
import {
  useAthleteRoutine,
  type AthleteRoutine,
} from '../../../lib/athlete-routine'
import { cn } from '../../../lib/cn'
import { formatIsoDate, todayInAppTimeZone } from '../../../lib/iso-date'
import { useNavigate } from '../../../lib/navigation'
import type { RoutineDay } from '../../../lib/routines'
import {
  formatStartTime,
  useInProgressSession,
  type TrainingSession,
} from '../../../lib/training-sessions'
import { trainingPath } from '../../../router/paths'
import { PrimaryButton } from '../../../ui/button'
import { Callout } from '../../../ui/callout'
import { Card } from '../../../ui/card'
import { EmptyState } from '../../../ui/empty-state'
import {
  CalendarDays,
  ClipboardList,
  Dumbbell,
  PlayCircle,
} from '../../../ui/icons'
import { dayTitle, EXERCISES_SHOWN, nextDayOf } from '../dashboard-format'
import { useStartTodayTraining } from '../hooks/use-start-today-training'
import { CardError } from './CardError'
import { CardSkeleton } from './CardSkeleton'
import { DashboardCardHeader } from './DashboardCardHeader'

const TITLE_ID = 'dashboard-training-title'
const UNEXPECTED_ERROR = 'Ocurrió un error inesperado. Intentá nuevamente.'

type TodayTrainingCardProps = {
  athleteId: string
  className?: string
}

// lo primero del día: el entrenamiento en curso (Retomar) o el día que toca (Iniciar). Sigue la
// misma lógica que «Mi rutina» (US-17, US-18) con un resumen más corto
export function TodayTrainingCard({
  athleteId,
  className,
}: TodayTrainingCardProps) {
  const routine = useAthleteRoutine(athleteId)
  // si la consulta de la sesión en progreso falla, se ofrece iniciar igual: el 409 lleva a retomarla
  const inProgress = useInProgressSession(athleteId)
  const isLoading = routine.isPending || inProgress.isPending

  const content = () => {
    if (isLoading) {
      return <CardSkeleton label="Cargando el entrenamiento de hoy" />
    }

    if (inProgress.data) return <ResumeTraining session={inProgress.data} />

    if (routine.isError && routine.data === undefined) {
      return (
        <CardError
          error={routine.error}
          isRetrying={routine.isFetching}
          onRetry={() => void routine.refetch()}
        />
      )
    }

    if (routine.data === null || routine.data === undefined) {
      return <NoRoutine />
    }

    return <RoutineToday athleteId={athleteId} athleteRoutine={routine.data} />
  }

  return (
    <Card
      aria-labelledby={TITLE_ID}
      aria-busy={isLoading}
      className={cn('flex flex-col gap-4', className)}
    >
      <DashboardCardHeader
        id={TITLE_ID}
        title="Entrenamiento de hoy"
        icon={<Dumbbell />}
      />
      {content()}
    </Card>
  )
}

// hay una sesión abierta: es lo único que se ofrece hasta cerrarla
function ResumeTraining({ session }: { session: TrainingSession }) {
  const navigate = useNavigate()
  const time = formatStartTime(session.startedAt)
  const since =
    session.sessionDate === todayInAppTimeZone()
      ? `desde las ${time}`
      : `desde el ${formatIsoDate(session.sessionDate)} a las ${time}`

  return (
    <div className="rounded-control border-primary-soft-strong bg-primary-soft flex flex-col gap-4 border p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 flex-col gap-0.5">
        <h3 className="text-base font-semibold">
          Tenés un entrenamiento en curso
        </h3>
        <p className="text-sm break-words">
          {dayTitle(session.day)}, {since}.
        </p>
      </div>
      <PrimaryButton
        size="lg"
        className="w-full sm:w-auto"
        onClick={() => navigate(trainingPath(session.id))}
      >
        <PlayCircle aria-hidden="true" /> Retomar
      </PrimaryButton>
    </div>
  )
}

function NoRoutine() {
  return (
    <EmptyState
      size="sm"
      icon={<ClipboardList />}
      title="Tu entrenador aún no te asignó una rutina"
      description="Cuando te asigne una, vas a ver acá qué te toca entrenar."
    />
  )
}

// sin sesión abierta: la rutina vencida, sin días o el día que toca con su botón de iniciar
function RoutineToday({
  athleteId,
  athleteRoutine,
}: {
  athleteId: string
  athleteRoutine: AthleteRoutine
}) {
  const day = nextDayOf(athleteRoutine)

  if (athleteRoutine.expired) {
    return (
      <EmptyState
        size="sm"
        icon={<CalendarDays />}
        title="Tu rutina venció"
        description={
          athleteRoutine.endDate
            ? `Estuvo vigente hasta el ${formatIsoDate(athleteRoutine.endDate)}. Pedile a tu entrenador una rutina nueva para seguir entrenando.`
            : 'Pedile a tu entrenador una rutina nueva para seguir entrenando.'
        }
      />
    )
  }

  if (day === null) {
    return (
      <EmptyState
        size="sm"
        icon={<CalendarDays />}
        title="Tu rutina todavía no tiene días cargados"
        description="Cuando tu entrenador cargue los días, vas a ver acá qué te toca entrenar."
      />
    )
  }

  return (
    <DayToStart
      athleteId={athleteId}
      routineName={athleteRoutine.routine.name}
      day={day}
    />
  )
}

function DayToStart({
  athleteId,
  routineName,
  day,
}: {
  athleteId: string
  routineName: string
  day: RoutineDay
}) {
  const training = useStartTodayTraining(athleteId)
  const shown = day.exercises.slice(0, EXERCISES_SHOWN)
  const hidden = day.exercises.length - shown.length
  const { error } = training

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <p className="text-muted-foreground text-sm break-words">
          {routineName}
        </p>
        <h3 className="text-xl font-semibold break-words">{dayTitle(day)}</h3>
      </div>

      {day.exercises.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          Este día todavía no tiene ejercicios.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          <ul aria-label="Ejercicios del día" className="flex flex-col">
            {shown.map((exercise) => (
              <li
                key={exercise.id}
                className="border-border-subtle flex items-baseline justify-between gap-3 border-b py-2 text-sm last:border-b-0"
              >
                <span className="min-w-0 break-words">
                  {exercise.exerciseName}
                </span>
                <span className="text-muted-foreground shrink-0 tabular-nums">
                  {exercise.sets} × {exercise.reps}
                </span>
              </li>
            ))}
          </ul>
          {hidden > 0 && (
            <p className="text-muted-foreground text-sm">y {hidden} más</p>
          )}
        </div>
      )}

      {training.conflict && (
        <Callout tone="warning">
          Ya tenés un entrenamiento en curso, pero no pudimos traerlo. Recargá
          la página para retomarlo.
        </Callout>
      )}
      {error && (
        <Callout tone="danger">
          {isApiError(error) ? error.message : UNEXPECTED_ERROR}
        </Callout>
      )}

      {day.exercises.length > 0 && (
        <PrimaryButton
          size="lg"
          className="w-full sm:w-auto sm:self-start"
          disabled={training.isStarting}
          onClick={() => void training.start(day.id)}
        >
          <PlayCircle aria-hidden="true" />
          {training.isStarting ? 'Iniciando…' : 'Iniciar entrenamiento'}
        </PrimaryButton>
      )}
    </div>
  )
}
