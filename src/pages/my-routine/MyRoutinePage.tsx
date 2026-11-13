import { unavailableReason } from '../../components/routine-unavailable'
import { PageHeader } from '../../layout'
import { useAthleteRoutine } from '../../lib/athlete-routine'
import { useAuth } from '../../lib/auth'
import { useMuscleGroups } from '../../lib/exercises'
import { todayInAppTimeZone } from '../../lib/iso-date'
import type { RoutineDay } from '../../lib/routines'
import { useInProgressSession } from '../../lib/training-sessions'
import { ExpiredNotice } from './components/ExpiredNotice'
import { InProgressNotice } from './components/InProgressNotice'
import { MyRoutineError } from './components/MyRoutineError'
import { MyRoutineSkeleton } from './components/MyRoutineSkeleton'
import { MyRoutineUnavailable } from './components/MyRoutineUnavailable'
import { NoRoutine } from './components/NoRoutine'
import { RoutineDays } from './components/RoutineDays'
import { RoutineDetailsCard } from './components/RoutineDetailsCard'
import { RoutineSummary } from './components/RoutineSummary'
import { StartTraining } from './components/StartTraining'
import { useStartTraining } from './hooks/use-start-training'
import { CONTENT_GRID } from './layout'

// página del atleta (US-17): la rutina que le asignó su entrenador, con el día que le toca hoy
// destacado y el resto de los días. Desde acá inicia el entrenamiento del día elegido o retoma
// el que tiene en curso (US-18). El título no cambia con el estado: es el mismo del menú
export function MyRoutinePage() {
  const { user } = useAuth()
  // el atleta es el usuario de la sesión: el mismo id que devuelve GET /auth/me
  const athleteId = user?.id ?? ''
  const { data, error, isFetching, refetch } = useAthleteRoutine(athleteId)
  // nombres de los grupos musculares; si no llegan, los ejercicios se muestran igual
  const { data: muscleGroups } = useMuscleGroups()
  // se pide junto con la rutina: decide si se ofrece iniciar o retomar (contrato de API, 10.12)
  const inProgress = useInProgressSession(athleteId)
  const training = useStartTraining(athleteId)
  // "hoy" en la zona de la app, no en la del navegador
  const today = todayInAppTimeZone()

  // si la consulta de la sesión en progreso falló se ofrece iniciar igual: si hay una, el 409
  // lleva a retomarla. Después de un 409, mientras no se sabe cuál es, no se ofrece iniciar otra
  const session = inProgress.data ?? null
  const isLookingForSession =
    training.conflict &&
    session === null &&
    (inProgress.isFetching || inProgress.isError)
  const canStart = session === null && !isLookingForSession

  const notice = (session !== null || training.conflict) && (
    <InProgressNotice
      session={session}
      conflict={training.conflict}
      isFetching={inProgress.isFetching}
      error={inProgress.error}
      onRetry={() => void inProgress.refetch()}
      today={today}
    />
  )

  // vencida: no se ofrece (el aviso de vencimiento explica por qué); un día sin ejercicios
  // tampoco (lo dice su estado vacío). El 422 del backend es la red de seguridad
  const startAction = (day: RoutineDay, expired: boolean) => {
    if (!canStart || expired || day.exercises.length === 0) return null
    return (
      <StartTraining
        {...training.dayState(day.id)}
        onStart={() => void training.start(day.id)}
      />
    )
  }

  const content = () => {
    // con datos ya cargados, un error al volver a pedir no tapa la rutina
    if (data === undefined) {
      if (!error) return <MyRoutineSkeleton />
      const reason = unavailableReason(error)
      return reason ? (
        <MyRoutineUnavailable reason={reason} />
      ) : (
        <MyRoutineError
          error={error}
          isRetrying={isFetching}
          onRetry={() => void refetch()}
        />
      )
    }

    // se espera también la sesión en progreso: así no aparece Iniciar para cambiarse enseguida
    // por el aviso con Retomar
    if (inProgress.isPending) return <MyRoutineSkeleton />

    if (data === null) {
      return (
        <>
          {notice}
          <NoRoutine />
        </>
      )
    }

    return (
      <>
        {notice}
        {data.expired && data.endDate !== null && (
          <ExpiredNotice endDate={data.endDate} />
        )}
        <div className={CONTENT_GRID}>
          <RoutineDays
            // otra asignación vuelve a abrir el día que toca
            key={data.assignmentId}
            days={data.routine.days}
            nextDayId={data.nextDayId}
            muscleGroups={muscleGroups}
            renderAction={(day) => startAction(day, data.expired)}
          />
          <RoutineDetailsCard
            routine={data.routine}
            assignmentDate={data.assignmentDate}
            className="lg:sticky lg:top-24"
          />
        </div>
      </>
    )
  }

  return (
    // scroll-mt: lo que recibe el foco (pestañas, panel) no queda tapado por la barra superior fija
    <div className="flex max-w-265 flex-col gap-6 [&_*]:scroll-mt-24">
      <PageHeader
        title="Mi rutina"
        description={
          // mientras se espera la sesión en progreso, el skeleton ocupa también el resumen
          data && !inProgress.isPending ? (
            <RoutineSummary athleteRoutine={data} />
          ) : undefined
        }
      />
      {content()}
    </div>
  )
}
