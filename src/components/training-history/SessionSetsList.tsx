import { useId } from 'react'
import { formatWeight, type RoutineExercise } from '../../lib/routines'
import type { PerformedSet, TrainingSession } from '../../lib/training-sessions'

type SessionSetsListProps = {
  session: TrainingSession
}

// lo que quedó de una serie, en texto: se entiende sin color. Una serie sin registro sigue pendiente
const describeSet = (set: PerformedSet | undefined) => {
  if (!set) return 'Sin registrar'
  if (set.status === 'SKIPPED') {
    return set.skipReason ? `Omitida: ${set.skipReason}` : 'Omitida'
  }
  const load =
    set.weight !== null && set.reps !== null
      ? `${formatWeight(set.weight)} × ${set.reps} repeticiones`
      : 'Hecha'
  return set.rpe !== null ? `${load} · RPE ${set.rpe}` : load
}

// un ejercicio del día con sus series prescritas (1..sets), cada una con lo registrado. Las series
// registradas de más (el entrenador bajó las series después) no se muestran, como en la pantalla
// del entrenamiento (US-19)
function ExerciseResult({
  exercise,
  performedSets,
}: {
  exercise: RoutineExercise
  performedSets: PerformedSet[]
}) {
  const titleId = useId()
  const setNumbers = Array.from(
    { length: exercise.sets },
    (_, index) => index + 1,
  )

  return (
    <section
      aria-labelledby={titleId}
      className="border-border-subtle flex flex-col gap-2 border-t pt-4"
    >
      <h3 id={titleId} className="text-[15px] font-semibold break-words">
        {exercise.exerciseName}
      </h3>
      <ol className="divide-border-subtle flex flex-col divide-y">
        {setNumbers.map((setNumber) => {
          const record = performedSets.find(
            (set) =>
              set.routineExerciseId === exercise.id &&
              set.setNumber === setNumber,
          )
          return (
            <li
              key={setNumber}
              className="flex flex-wrap justify-between gap-x-4 gap-y-1 py-2 text-sm"
            >
              <span className="font-medium">Serie {setNumber}</span>
              <span className="text-muted-foreground tabular-nums">
                {describeSet(record)}
              </span>
            </li>
          )
        })}
      </ol>
    </section>
  )
}

// el detalle de series de la sesión, por ejercicio (US-19 para lo registrado, US-21 para el historial)
export function SessionSetsList({ session }: SessionSetsListProps) {
  return (
    <div className="flex flex-col gap-4">
      {session.day.exercises.map((exercise) => (
        <ExerciseResult
          key={exercise.id}
          exercise={exercise}
          performedSets={session.performedSets}
        />
      ))}
    </div>
  )
}
