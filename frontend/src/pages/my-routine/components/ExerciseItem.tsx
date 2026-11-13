import {
  formatRest,
  formatSetsReps,
  formatWeight,
  type RoutineExercise,
} from '../../../lib/routines'
import { Badge } from '../../../ui/badge'
import { NotebookPen } from '../../../ui/icons'

type ExerciseItemProps = {
  exercise: RoutineExercise
  // posición dentro del día, desde 1
  position: number
  // undefined mientras el catálogo de grupos no llegó (o si falló): se omite el badge
  muscleGroupName?: string
}

type Metric = { label: string; value: string }

// solo lo que cargó el entrenador; series × repeticiones siempre está
const metricsOf = (exercise: RoutineExercise): Metric[] =>
  [
    {
      label: 'Series × reps',
      value: formatSetsReps(exercise.sets, exercise.reps),
    },
    exercise.recommendedWeight !== null && {
      label: 'Peso',
      value: formatWeight(exercise.recommendedWeight),
    },
    exercise.rest !== null && {
      label: 'Descanso',
      value: formatRest(exercise.rest),
    },
    exercise.rirRpe !== null && { label: 'Esfuerzo', value: exercise.rirRpe },
  ].filter((metric): metric is Metric => metric !== false)

// un ejercicio del día: los datos en un <dl> para que cada valor se lea con su etiqueta.
// Celdas con borde sobre blanco: el texto muted sobre bg-muted no llega a AA
export function ExerciseItem({
  exercise,
  position,
  muscleGroupName,
}: ExerciseItemProps) {
  return (
    <li className="flex gap-3 px-5 py-4 sm:gap-4 sm:px-6">
      <span
        aria-hidden="true"
        className="bg-secondary text-secondary-foreground flex size-8 shrink-0 items-center justify-center rounded-lg text-sm font-bold"
      >
        {position}
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 pt-1">
          <h3 className="text-base font-semibold break-words">
            {exercise.exerciseName}
          </h3>
          {muscleGroupName && (
            <Badge tone="primary" variant="outline" shape="pill">
              {muscleGroupName}
            </Badge>
          )}
        </div>
        <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {metricsOf(exercise).map(({ label, value }) => (
            <div
              key={label}
              className="border-border-subtle flex min-w-0 flex-col gap-0.5 rounded-lg border px-3 py-2"
            >
              <dt className="text-muted-foreground text-xs">{label}</dt>
              <dd className="text-sm font-semibold break-words tabular-nums">
                {value}
              </dd>
            </div>
          ))}
        </dl>
        {exercise.techniqueNote && (
          <p className="text-muted-foreground flex items-start gap-2 text-sm">
            <NotebookPen
              aria-hidden="true"
              className="mt-0.5 size-4 shrink-0"
            />
            <span className="min-w-0 break-words whitespace-pre-line">
              <span className="sr-only">Nota técnica: </span>
              {exercise.techniqueNote}
            </span>
          </p>
        )}
      </div>
    </li>
  )
}
