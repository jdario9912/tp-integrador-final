import {
  ExerciseForm,
  toExerciseFormValues,
  toExerciseInput,
  type ExerciseFormValues,
} from '../../components/exercise-form'
import { PageHeader } from '../../layout'
import { isApiError } from '../../lib/api'
import { muscleGroupName, useMuscleGroups } from '../../lib/exercises'
import { useNavigate, useParams } from '../../lib/navigation'
import { paths } from '../../router/paths'
import { OutlineButton } from '../../ui/button'
import { Callout } from '../../ui/callout'
import { EmptyState } from '../../ui/empty-state'
import { ArrowLeft, RotateCw, SearchX } from '../../ui/icons'
import { Skeleton } from '../../ui/skeleton'
import { TextLink } from '../../ui/text-link'
import { DeleteExerciseCard } from './components/DeleteExerciseCard'
import { GlobalExerciseDetails } from './components/GlobalExerciseDetails'
import { useDeleteExercise } from './hooks/use-delete-exercise'
import { useExercise } from './hooks/use-exercise'
import { useUpdateExercise } from './hooks/use-update-exercise'

// 404 (no existe o se dio de baja) y 403 (es de otro entrenador): no hay nada que reintentar
const isUnavailable = (error: Error) =>
  isApiError(error) && (error.status === 403 || error.status === 404)

const errorMessage = (error: Error) =>
  isApiError(error)
    ? error.message
    : 'Ocurrió un error inesperado. Intentá nuevamente.'

export function EditExercisePage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const exerciseQuery = useExercise(id)
  const muscleGroupsQuery = useMuscleGroups()
  const updateExercise = useUpdateExercise(id)
  const deleteExercise = useDeleteExercise(id)

  const exercise = exerciseQuery.data
  const muscleGroups = muscleGroupsQuery.data
  const error = exerciseQuery.error ?? muscleGroupsQuery.error

  const backLink = (
    <TextLink
      to={paths.exercises}
      className="text-muted-foreground hover:text-primary self-start"
    >
      <ArrowLeft aria-hidden="true" /> Volver a ejercicios
    </TextLink>
  )

  if (error) {
    return (
      <div className="flex max-w-265 flex-col gap-6">
        {backLink}
        {isUnavailable(error) ? (
          <EmptyState
            icon={<SearchX />}
            title="No encontramos este ejercicio"
            description={error.message}
          />
        ) : (
          <div className="flex flex-col items-start gap-3">
            <Callout tone="danger" className="self-stretch">
              {errorMessage(error)}
            </Callout>
            <OutlineButton
              size="sm"
              onClick={() => {
                if (exerciseQuery.error) void exerciseQuery.refetch()
                if (muscleGroupsQuery.error) void muscleGroupsQuery.refetch()
              }}
            >
              <RotateCw aria-hidden="true" /> Reintentar
            </OutlineButton>
          </div>
        )}
      </div>
    )
  }

  if (!exercise || !muscleGroups) {
    return (
      <div
        role="status"
        aria-label="Cargando ejercicio"
        className="flex max-w-265 flex-col gap-6"
      >
        <Skeleton className="h-5 w-36" />
        <Skeleton className="h-9 w-72" />
        <Skeleton className="h-96" />
      </div>
    )
  }

  if (exercise.global) {
    return (
      <div className="flex max-w-265 flex-col gap-6">
        {backLink}
        <PageHeader title={exercise.name} />
        <Callout tone="info">
          Es un ejercicio del sistema: podés usarlo en tus rutinas, pero no
          editarlo ni eliminarlo.
        </Callout>
        <GlobalExerciseDetails
          exercise={exercise}
          muscleGroupName={muscleGroupName(muscleGroups, exercise.muscleGroup)}
        />
      </div>
    )
  }

  // vuelve al catálogo con el aviso; el nombre es el guardado, por si se editó
  const handleSave = async (values: ExerciseFormValues) => {
    const saved = await updateExercise.mutateAsync(toExerciseInput(values))
    navigate(paths.exercises, {
      state: { notice: `Guardaste los cambios de ${saved.name}.` },
    })
  }

  const handleDelete = async () => {
    await deleteExercise.mutateAsync()
    navigate(paths.exercises, {
      state: { notice: `Eliminaste el ejercicio ${exercise.name}.` },
    })
  }

  return (
    <div className="flex max-w-265 flex-col gap-6">
      {backLink}
      <PageHeader
        title={`Editar ${exercise.name}`}
        description="Actualizá los datos de tu ejercicio."
      />
      <ExerciseForm
        // al cambiar de ejercicio el formulario se vuelve a montar con sus datos
        key={exercise.id}
        idPrefix="edit-exercise"
        defaultValues={toExerciseFormValues(exercise)}
        muscleGroups={muscleGroups}
        onSubmit={handleSave}
        onCancel={() => navigate(paths.exercises)}
        submitLabel="Guardar cambios"
      />
      {deleteExercise.error && (
        <Callout tone="danger">{errorMessage(deleteExercise.error)}</Callout>
      )}
      <DeleteExerciseCard
        exerciseName={exercise.name}
        onDelete={handleDelete}
        isDeleting={deleteExercise.isPending}
      />
    </div>
  )
}
