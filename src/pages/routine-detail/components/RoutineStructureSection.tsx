import { muscleGroupName, type MuscleGroup } from '../../../lib/exercises'
import {
  formatExercisesCount,
  formatRest,
  formatSetsReps,
  formatWeight,
  type RoutineDay,
  type RoutineExercise,
} from '../../../lib/routines'
import { routineStructurePath } from '../../../router/paths'
import { Badge } from '../../../ui/badge'
import { SectionCard } from '../../../ui/card'
import { EmptyState } from '../../../ui/empty-state'
import { CalendarDays, Dumbbell } from '../../../ui/icons'
import { TextLink } from '../../../ui/text-link'

type RoutineStructureSectionProps = {
  routineId: string
  days: RoutineDay[]
  // sin cargar se muestra el código del grupo muscular
  muscleGroups?: MuscleGroup[]
}

const TITLE = 'Días y ejercicios'

// "4 × 10 · 80 kg · Descanso 1 min 30 s · RIR 2": solo lo que se cargó
const prescription = (exercise: RoutineExercise) =>
  [
    formatSetsReps(exercise.sets, exercise.reps),
    exercise.recommendedWeight !== null &&
      formatWeight(exercise.recommendedWeight),
    exercise.rest !== null && `Descanso ${formatRest(exercise.rest)}`,
    exercise.rirRpe,
  ]
    .filter(Boolean)
    .join(' · ')

// estructura en modo lectura; se edita en "Configurar estructura"
export function RoutineStructureSection({
  routineId,
  days,
  muscleGroups,
}: RoutineStructureSectionProps) {
  return (
    <SectionCard title={TITLE} icon={<CalendarDays />} aria-label={TITLE}>
      {days.length === 0 ? (
        <EmptyState
          size="sm"
          icon={<CalendarDays />}
          title="Todavía no cargaste los días"
          description="Agregá los días de entrenamiento y los ejercicios de cada uno."
          action={
            <TextLink to={routineStructurePath(routineId)}>
              Configurar estructura
            </TextLink>
          }
        />
      ) : (
        <ol className="flex flex-col gap-4">
          {days.map((day) => (
            <li
              key={day.id}
              aria-label={`Día ${day.dayNumber}: ${day.name}`}
              className="rounded-control border-border-subtle flex flex-col gap-3 border p-4"
            >
              <div className="flex flex-wrap items-center gap-3">
                <span
                  aria-hidden="true"
                  className="bg-primary-soft-strong text-primary flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-bold"
                >
                  {day.dayNumber}
                </span>
                <h3 className="min-w-0 flex-1 text-base font-semibold break-words">
                  {day.name}
                </h3>
                <Badge>{formatExercisesCount(day.exercises.length)}</Badge>
              </div>
              {day.exercises.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                  Sin ejercicios cargados.
                </p>
              ) : (
                <ol className="divide-border-subtle flex flex-col divide-y">
                  {day.exercises.map((exercise) => (
                    <li
                      key={exercise.id}
                      className="flex items-start gap-3 py-3 first:pt-0 last:pb-0"
                    >
                      <Dumbbell
                        aria-hidden="true"
                        className="text-primary mt-0.5 size-4 shrink-0"
                      />
                      <div className="flex min-w-0 flex-1 flex-col gap-1">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                          <span className="text-[15px] font-semibold break-words">
                            {exercise.exerciseName}
                          </span>
                          <Badge tone="primary" variant="outline" shape="pill">
                            {muscleGroupName(
                              muscleGroups,
                              exercise.muscleGroup,
                            )}
                          </Badge>
                        </div>
                        <span className="text-sm">
                          {prescription(exercise)}
                        </span>
                        {exercise.techniqueNote && (
                          <span className="text-muted-foreground text-sm break-words whitespace-pre-line italic">
                            {exercise.techniqueNote}
                          </span>
                        )}
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </li>
          ))}
        </ol>
      )}
    </SectionCard>
  )
}
