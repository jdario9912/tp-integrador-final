import {
  ExerciseForm,
  toExerciseInput,
  type ExerciseFormValues,
} from '../../components/exercise-form'
import { PageHeader } from '../../layout'
import { isApiError } from '../../lib/api'
import { useMuscleGroups } from '../../lib/exercises'
import { useNavigate } from '../../lib/navigation'
import { paths } from '../../router/paths'
import { OutlineButton } from '../../ui/button'
import { Callout } from '../../ui/callout'
import { ArrowLeft, RotateCw } from '../../ui/icons'
import { Skeleton } from '../../ui/skeleton'
import { TextLink } from '../../ui/text-link'
import { useCreateExercise } from './hooks/use-create-exercise'

export function NewExercisePage() {
  const navigate = useNavigate()
  const createExercise = useCreateExercise()
  const { data: muscleGroups, error, refetch } = useMuscleGroups()

  // vuelve al catálogo con el aviso; el nombre es el guardado
  const handleSubmit = async (values: ExerciseFormValues) => {
    const exercise = await createExercise.mutateAsync(toExerciseInput(values))
    navigate(paths.exercises, {
      state: { notice: `Creaste el ejercicio ${exercise.name}.` },
    })
  }

  const renderContent = () => {
    if (error) {
      return (
        <div className="flex flex-col items-start gap-3">
          <Callout tone="danger" className="self-stretch">
            {isApiError(error)
              ? error.message
              : 'Ocurrió un error inesperado. Intentá nuevamente.'}
          </Callout>
          <OutlineButton size="sm" onClick={() => void refetch()}>
            <RotateCw aria-hidden="true" /> Reintentar
          </OutlineButton>
        </div>
      )
    }
    // el formulario necesita los grupos musculares para el select
    if (!muscleGroups) {
      return (
        <div role="status" aria-label="Cargando formulario">
          <Skeleton className="h-96" />
        </div>
      )
    }
    return (
      <ExerciseForm
        idPrefix="new-exercise"
        muscleGroups={muscleGroups}
        onSubmit={handleSubmit}
        onCancel={() => navigate(paths.exercises)}
        submitLabel="Crear ejercicio"
      />
    )
  }

  return (
    <div className="flex max-w-265 flex-col gap-6">
      <TextLink
        to={paths.exercises}
        className="text-muted-foreground hover:text-primary self-start"
      >
        <ArrowLeft aria-hidden="true" /> Volver a ejercicios
      </TextLink>
      <PageHeader
        title="Nuevo ejercicio"
        description="Sumá un ejercicio propio a tu catálogo para usarlo en tus rutinas."
      />
      {renderContent()}
    </div>
  )
}
