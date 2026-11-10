import {
  RoutineStructureForm,
  toRoutineStructureInput,
  toStructureFormValues,
  type RoutineStructureFormValues,
} from '../../components/routine-structure-form'
import {
  RoutineUnavailable,
  unavailableReason,
} from '../../components/routine-unavailable'
import { PageHeader } from '../../layout'
import { isApiError, type ApiError } from '../../lib/api'
import { useMuscleGroups } from '../../lib/exercises'
import { useNavigate, useParams } from '../../lib/navigation'
import { useDuplicateRoutine, useRoutine } from '../../lib/routines'
import { routineDetailPath } from '../../router/paths'
import { OutlineButton } from '../../ui/button'
import { Callout } from '../../ui/callout'
import { ArrowLeft, Copy, RotateCw } from '../../ui/icons'
import { Skeleton } from '../../ui/skeleton'
import { TextLink } from '../../ui/text-link'
import { ExercisePicker } from './components/ExercisePicker'
import { useSaveRoutineStructure } from './hooks/use-save-routine-structure'

const errorMessage = (error: Error) =>
  isApiError(error)
    ? error.message
    : 'Ocurrió un error inesperado. Intentá nuevamente.'

export function RoutineStructurePage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const { data: routine, error, isFetching, refetch } = useRoutine(id)
  // no bloquea la página: hasta que llegan se muestra el código del grupo muscular
  const { data: muscleGroups } = useMuscleGroups()
  const saveStructure = useSaveRoutineStructure(id)
  const duplicateRoutine = useDuplicateRoutine()

  const reason = error ? unavailableReason(error) : undefined
  if (reason) return <RoutineUnavailable reason={reason} />

  const backLink = (
    <TextLink
      to={routineDetailPath(id)}
      className="text-muted-foreground hover:text-primary self-start"
    >
      <ArrowLeft aria-hidden="true" /> Volver a la rutina
    </TextLink>
  )

  if (error) {
    return (
      <div className="flex max-w-265 flex-col gap-6">
        {backLink}
        <div className="flex flex-col items-start gap-3">
          <Callout tone="danger" className="self-stretch">
            {errorMessage(error)}
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
      </div>
    )
  }

  if (!routine) {
    return (
      <div
        role="status"
        aria-label="Cargando rutina"
        className="flex max-w-265 flex-col gap-6"
      >
        <Skeleton className="h-5 w-36" />
        <Skeleton className="h-9 w-72" />
        <Skeleton className="h-64" />
        <Skeleton className="h-64" />
      </div>
    )
  }

  // vuelve al detalle con el aviso
  const handleSave = async (values: RoutineStructureFormValues) => {
    const saved = await saveStructure.mutateAsync(
      toRoutineStructureInput(values),
    )
    navigate(routineDetailPath(saved.id), {
      state: { notice: `Guardaste la estructura de ${saved.name}.` },
    })
  }

  // la copia arranca sin series registradas: ahí sí se pueden quitar días y ejercicios
  const handleDuplicate = async () => {
    try {
      const copy = await duplicateRoutine.mutateAsync(routine.id)
      navigate(routineDetailPath(copy.id), {
        state: {
          notice: `Creaste ${copy.name}. Configurá su estructura con los cambios que necesitás.`,
        },
      })
    } catch {
      // lo muestra la página con el error de la mutación
    }
  }

  // 422: se quiso quitar un día o ejercicio que ya tiene series registradas
  const renderErrorAction = (saveError: ApiError) =>
    saveError.status === 422 && (
      <OutlineButton
        size="sm"
        disabled={duplicateRoutine.isPending}
        onClick={() => void handleDuplicate()}
      >
        <Copy aria-hidden="true" />
        {duplicateRoutine.isPending ? 'Duplicando…' : 'Duplicar rutina'}
      </OutlineButton>
    )

  return (
    <div className="flex max-w-265 flex-col gap-6">
      {backLink}
      <PageHeader
        eyebrow="Constructor de rutinas"
        title={routine.name}
        description="Armá los días de entrenamiento y cargá los ejercicios de cada uno."
      />
      {duplicateRoutine.error && (
        <Callout tone="danger">{errorMessage(duplicateRoutine.error)}</Callout>
      )}
      <RoutineStructureForm
        // al cambiar de rutina el formulario se vuelve a montar con sus datos
        key={routine.id}
        idPrefix="routine-structure"
        defaultValues={toStructureFormValues(routine)}
        muscleGroups={muscleGroups}
        onSubmit={handleSave}
        onCancel={() => navigate(routineDetailPath(routine.id))}
        renderExercisePicker={(pickerProps) => (
          <ExercisePicker {...pickerProps} muscleGroups={muscleGroups} />
        )}
        renderErrorAction={renderErrorAction}
      />
    </div>
  )
}
