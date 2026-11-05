import { isApiError } from '../../../lib/api'
import {
  muscleGroupName,
  type Exercise,
  type MuscleGroup,
} from '../../../lib/exercises'
import { cn } from '../../../lib/cn'
import { useNavigate } from '../../../lib/navigation'
import { paths } from '../../../router/paths'
import { OutlineButton, PrimaryButton } from '../../../ui/button'
import { Callout } from '../../../ui/callout'
import { Card } from '../../../ui/card'
import { EmptyState } from '../../../ui/empty-state'
import { Dumbbell, Plus, RotateCw, SearchX } from '../../../ui/icons'
import { Skeleton } from '../../../ui/skeleton'
import { ExerciseCard } from './ExerciseCard'

const gridClasses =
  'grid grid-cols-[repeat(auto-fill,minmax(min(300px,100%),1fr))] gap-5'

const SKELETON_CARDS = 6

type ExercisesListProps = {
  exercises: Exercise[] | undefined
  muscleGroups?: MuscleGroup[]
  // primera carga, todavía sin datos para mostrar
  isPending: boolean
  // se muestran los datos anteriores mientras llega la página o búsqueda nueva
  isUpdating: boolean
  error: Error | null
  hasFilters: boolean
  onRetry: () => void
}

export function ExercisesList({
  exercises,
  muscleGroups,
  isPending,
  isUpdating,
  error,
  hasFilters,
  onRetry,
}: ExercisesListProps) {
  const navigate = useNavigate()

  if (error) {
    return (
      <div className="flex flex-col items-start gap-3">
        <Callout tone="danger" className="self-stretch">
          {isApiError(error)
            ? error.message
            : 'Ocurrió un error inesperado. Intentá nuevamente.'}
        </Callout>
        <OutlineButton size="sm" onClick={onRetry}>
          <RotateCw aria-hidden="true" /> Reintentar
        </OutlineButton>
      </div>
    )
  }

  if (isPending || !exercises) {
    return (
      <div
        role="status"
        aria-label="Cargando ejercicios"
        className={gridClasses}
      >
        {Array.from({ length: SKELETON_CARDS }, (_, index) => (
          <Card key={index} padding="sm" className="flex flex-col gap-4">
            <div className="flex items-start gap-3">
              <Skeleton className="size-11 rounded-lg" />
              <div className="flex flex-col gap-2">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-6 w-24 rounded-full" />
              </div>
            </div>
            <Skeleton className="h-10" />
          </Card>
        ))}
      </div>
    )
  }

  if (exercises.length === 0) {
    // sin filtros siempre debería haber globales: el vacío igual invita a crear uno propio
    return hasFilters ? (
      <EmptyState
        icon={<SearchX />}
        title="No se encontraron ejercicios"
        description="Probá con otro nombre u otro grupo muscular, o creá un ejercicio nuevo."
      />
    ) : (
      <EmptyState
        icon={<Dumbbell />}
        title="Todavía no hay ejercicios"
        description="Creá tu primer ejercicio para usarlo en las rutinas de tus atletas."
        action={
          <PrimaryButton onClick={() => navigate(paths.newExercise)}>
            <Plus aria-hidden="true" /> Nuevo ejercicio
          </PrimaryButton>
        }
      />
    )
  }

  return (
    <ul
      aria-label="Ejercicios"
      aria-busy={isUpdating}
      className={cn(
        gridClasses,
        'transition-opacity',
        isUpdating && 'opacity-60',
      )}
    >
      {exercises.map((exercise) => (
        <li key={exercise.id}>
          <ExerciseCard
            exercise={exercise}
            muscleGroupName={muscleGroupName(
              muscleGroups,
              exercise.muscleGroup,
            )}
          />
        </li>
      ))}
    </ul>
  )
}
