import { formatWeight, type RoutineExercise } from '../../../lib/routines'
import type { PerformedSet } from '../../../lib/training-sessions'
import { SetRow } from './SetRow'

type ExerciseSetsProps = {
  athleteId: string
  sessionId: string
  exercise: RoutineExercise
  // las series de toda la sesión: acá se toman las de este ejercicio
  performedSets: PerformedSet[]
  // solo en el entrenamiento en curso; si la sesión terminó, las series se muestran sin controles
  editable: boolean
}

// columnas de la grilla de cada serie: número, kg, repeticiones y el botón de completar
const GRID =
  'grid grid-cols-[2.5rem_minmax(0,1fr)_minmax(0,1fr)_3rem] gap-2 sm:gap-3'

// las series prescritas de un ejercicio (1..sets), cada una con su registro si existe. Las
// registradas que quedaron por encima de sets (el entrenador lo bajó) no se muestran
export function ExerciseSets({
  athleteId,
  sessionId,
  exercise,
  performedSets,
  editable,
}: ExerciseSetsProps) {
  const setNumbers = Array.from(
    { length: exercise.sets },
    (_, index) => index + 1,
  )
  const recordOf = (setNumber: number) =>
    performedSets.find(
      (set) =>
        set.routineExerciseId === exercise.id && set.setNumber === setNumber,
    )
  const doneCount = setNumbers.filter(
    (setNumber) => recordOf(setNumber)?.status === 'DONE',
  ).length

  return (
    <div
      role="group"
      aria-label={`Series de ${exercise.exerciseName}`}
      className="border-border-subtle flex flex-col border-t pt-3"
    >
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-sm font-semibold">Series</p>
        <p className="text-muted-foreground text-sm tabular-nums">
          {doneCount} de {exercise.sets} hechas
        </p>
      </div>
      {editable && (
        <div
          aria-hidden="true"
          className={`text-muted-foreground mt-2 text-xs ${GRID}`}
        >
          <span>Serie</span>
          <span>kg</span>
          <span>Reps</span>
          <span />
        </div>
      )}
      <div className="divide-border-subtle divide-y">
        {setNumbers.map((setNumber) =>
          editable ? (
            <SetRow
              key={setNumber}
              athleteId={athleteId}
              sessionId={sessionId}
              exercise={exercise}
              setNumber={setNumber}
              record={recordOf(setNumber)}
            />
          ) : (
            <ReadOnlySet
              key={setNumber}
              setNumber={setNumber}
              record={recordOf(setNumber)}
            />
          ),
        )}
      </div>
    </div>
  )
}

// una serie de una sesión que ya no está en curso: solo lo que quedó registrado
function ReadOnlySet({
  setNumber,
  record,
}: {
  setNumber: number
  record?: PerformedSet
}) {
  return (
    <div className="flex items-baseline gap-3 py-2 text-sm">
      <span className="w-10 shrink-0 font-bold tabular-nums">{setNumber}</span>
      <span className="min-w-0 break-words">{readOnlyText(record)}</span>
    </div>
  )
}

const readOnlyText = (record?: PerformedSet) => {
  if (!record) return 'Sin registrar'
  if (record.status === 'SKIPPED') return `Omitida: ${record.skipReason ?? ''}`
  const weight =
    record.weight === null ? 'sin peso' : formatWeight(record.weight)
  const rpe = record.rpe ? ` · RPE ${record.rpe}` : ''
  return `${weight} × ${record.reps ?? 0} reps${rpe}`
}
