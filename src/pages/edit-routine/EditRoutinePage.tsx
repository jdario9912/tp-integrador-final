import {
  RoutineForm,
  toRoutineFormValues,
  toRoutineInput,
  type RoutineFormValues,
} from '../../components/routine-form'
import {
  RoutineUnavailable,
  unavailableReason,
} from '../../components/routine-unavailable'
import { PageHeader } from '../../layout'
import { isApiError } from '../../lib/api'
import { useNavigate, useParams } from '../../lib/navigation'
import { useRoutine } from '../../lib/routines'
import { routineDetailPath } from '../../router/paths'
import { OutlineButton } from '../../ui/button'
import { Callout } from '../../ui/callout'
import { ArrowLeft, RotateCw } from '../../ui/icons'
import { Skeleton } from '../../ui/skeleton'
import { TextLink } from '../../ui/text-link'
import { useUpdateRoutine } from './hooks/use-update-routine'

const errorMessage = (error: Error) =>
  isApiError(error)
    ? error.message
    : 'Ocurrió un error inesperado. Intentá nuevamente.'

export function EditRoutinePage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const { data: routine, error, isFetching, refetch } = useRoutine(id)
  const updateRoutine = useUpdateRoutine(id)

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
        <Skeleton className="h-96" />
      </div>
    )
  }

  // vuelve al detalle con el aviso; el nombre es el guardado, por si se editó
  const handleSave = async (values: RoutineFormValues) => {
    const saved = await updateRoutine.mutateAsync(toRoutineInput(values))
    navigate(routineDetailPath(saved.id), {
      state: { notice: `Guardaste los cambios de ${saved.name}.` },
    })
  }

  return (
    <div className="flex max-w-265 flex-col gap-6">
      {backLink}
      <PageHeader
        eyebrow="Constructor de rutinas"
        title={`Editar ${routine.name}`}
        description="Actualizá los datos generales de la rutina."
      />
      <RoutineForm
        // al cambiar de rutina el formulario se vuelve a montar con sus datos
        key={routine.id}
        idPrefix="edit-routine"
        defaultValues={toRoutineFormValues(routine)}
        onSubmit={handleSave}
        onCancel={() => navigate(routineDetailPath(routine.id))}
        submitLabel="Guardar cambios"
      />
    </div>
  )
}
