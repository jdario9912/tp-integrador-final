import { unavailableReason } from '../../components/routine-unavailable'
import { PageHeader } from '../../layout'
import { isApiError } from '../../lib/api'
import { useAuth } from '../../lib/auth'
import { useMuscleGroups } from '../../lib/exercises'
import { todayInAppTimeZone } from '../../lib/iso-date'
import { useParams } from '../../lib/navigation'
import { useTrainingSession } from '../../lib/training-sessions'
import { paths } from '../../router/paths'
import { OutlineButton } from '../../ui/button'
import { Callout } from '../../ui/callout'
import { ArrowLeft, RotateCw } from '../../ui/icons'
import { TextLink } from '../../ui/text-link'
// el mismo panel del día que Mi rutina (segundo uso; si aparece un tercero, pasa a src/components)
import { DayWorkout } from '../my-routine/components/DayWorkout'
import { TrainingSessionSkeleton } from './components/TrainingSessionSkeleton'
import { TrainingSessionSummary } from './components/TrainingSessionSummary'
import { TrainingSessionUnavailable } from './components/TrainingSessionUnavailable'
import { sessionTitle } from './training-session-format'

// pantalla del entrenamiento (US-18), solo del atleta: el día que inició o retomó desde Mi rutina,
// con la hora de inicio y los ejercicios planificados de solo lectura. Acá US-19 suma la carga
// de series de cada ejercicio y US-20 finalizar y cancelar (la acción del panel del día)
export function TrainingSessionPage() {
  const { sessionId = '' } = useParams()
  const { user } = useAuth()
  // el atleta es el usuario de la sesión: el mismo id que devuelve GET /auth/me
  const athleteId = user?.id ?? ''
  const {
    data: session,
    error,
    isFetching,
    refetch,
  } = useTrainingSession(athleteId, sessionId)
  // nombres de los grupos musculares; si no llegan, los ejercicios se muestran igual
  const { data: muscleGroups } = useMuscleGroups()
  // "hoy" en la zona de la app, no en la del navegador
  const today = todayInAppTimeZone()

  const content = () => {
    // con la sesión ya cargada, un error al volver a pedir no la tapa
    if (session === undefined) {
      if (!error) return <TrainingSessionSkeleton />
      const reason = unavailableReason(error)
      if (reason) return <TrainingSessionUnavailable reason={reason} />
      // corte de red o error del servidor: puede cambiar al reintentar
      return (
        <div className="flex flex-col items-start gap-3">
          <Callout tone="danger" className="self-stretch">
            {isApiError(error)
              ? error.message
              : 'Ocurrió un error inesperado. Intentá nuevamente.'}
          </Callout>
          <OutlineButton
            size="sm"
            disabled={isFetching}
            onClick={() => void refetch()}
          >
            <RotateCw aria-hidden="true" />
            {isFetching ? 'Reintentando…' : 'Reintentar'}
          </OutlineButton>
        </div>
      )
    }

    return (
      <DayWorkout
        day={session.day}
        isNext={false}
        muscleGroups={muscleGroups}
      />
    )
  }

  return (
    // mobile-first: una sola columna angosta, para seguir el entrenamiento en el teléfono
    <div className="flex max-w-3xl flex-col gap-6 [&_*]:scroll-mt-24">
      <TextLink
        to={paths.myRoutine}
        className="text-muted-foreground hover:text-primary self-start"
      >
        <ArrowLeft aria-hidden="true" /> Volver a Mi rutina
      </TextLink>
      <PageHeader
        title={session ? sessionTitle(session.status) : 'Entrenamiento'}
        description={
          session ? (
            <TrainingSessionSummary session={session} today={today} />
          ) : undefined
        }
      />
      {content()}
    </div>
  )
}
