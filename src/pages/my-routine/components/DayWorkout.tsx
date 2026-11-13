import type { ReactNode } from 'react'
import { findMuscleGroupName, type MuscleGroup } from '../../../lib/exercises'
import { formatExercisesCount, type RoutineDay } from '../../../lib/routines'
import { Badge } from '../../../ui/badge'
import { Card } from '../../../ui/card'
import { EmptyState } from '../../../ui/empty-state'
import { IconChip } from '../../../ui/icon-chip'
import { Dumbbell } from '../../../ui/icons'
import { dayTitle } from '../my-routine-format'
import { ExerciseItem } from './ExerciseItem'

type DayWorkoutProps = {
  day: RoutineDay
  // es el día que le toca al atleta
  isNext: boolean
  muscleGroups?: MuscleGroup[]
  // acción sobre el día, entre el título y los ejercicios: en Mi rutina, iniciar el entrenamiento
  // (US-18); en la pantalla del entrenamiento, US-20 suma finalizar y cancelar
  action?: ReactNode
}

// contenido del panel de un día: título, su acción si la hay y los ejercicios en orden.
// Lo reutiliza la pantalla del entrenamiento en curso (US-18)
export function DayWorkout({
  day,
  isNext,
  muscleGroups,
  action,
}: DayWorkoutProps) {
  const count = day.exercises.length

  return (
    <Card padding="none">
      <div className="border-border-subtle flex flex-wrap items-center gap-x-4 gap-y-2 border-b px-5 py-4 sm:px-6">
        <IconChip shape="square" size="sm">
          <Dumbbell />
        </IconChip>
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          {isNext && (
            <p className="text-primary text-sm font-semibold">Hoy te toca</p>
          )}
          <h2 className="text-lg font-semibold break-words sm:text-xl">
            {dayTitle(day)}
          </h2>
        </div>
        {count > 0 && <Badge>{formatExercisesCount(count)}</Badge>}
      </div>
      {action && (
        <div className="border-border-subtle border-b px-5 py-4 sm:px-6">
          {action}
        </div>
      )}
      {count === 0 ? (
        <EmptyState
          size="sm"
          icon={<Dumbbell />}
          title="Este día no tiene ejercicios"
          description="Tu entrenador todavía no cargó ejercicios para este día."
          className="px-5"
        />
      ) : (
        <ol aria-label="Ejercicios" className="divide-border-subtle divide-y">
          {day.exercises.map((exercise, index) => (
            <ExerciseItem
              key={exercise.id}
              exercise={exercise}
              position={index + 1}
              muscleGroupName={findMuscleGroupName(
                muscleGroups,
                exercise.muscleGroup,
              )}
            />
          ))}
        </ol>
      )}
    </Card>
  )
}
