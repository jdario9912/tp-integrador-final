import {
  RoutineForm,
  toRoutineInput,
  type RoutineFormValues,
} from '../../components/routine-form'
import { PageHeader } from '../../layout'
import { useNavigate } from '../../lib/navigation'
import { paths, routineDetailPath } from '../../router/paths'
import { ArrowLeft } from '../../ui/icons'
import { TextLink } from '../../ui/text-link'
import { useCreateRoutine } from './hooks/use-create-routine'

export function NewRoutinePage() {
  const navigate = useNavigate()
  const createRoutine = useCreateRoutine()

  // va al detalle de la rutina nueva con el aviso; el nombre es el guardado
  const handleSubmit = async (values: RoutineFormValues) => {
    const routine = await createRoutine.mutateAsync(toRoutineInput(values))
    navigate(routineDetailPath(routine.id), {
      state: { notice: `Creaste la rutina ${routine.name}.` },
    })
  }

  return (
    <div className="flex max-w-265 flex-col gap-6">
      <TextLink
        to={paths.routines}
        className="text-muted-foreground hover:text-primary self-start"
      >
        <ArrowLeft aria-hidden="true" /> Volver a rutinas
      </TextLink>
      <PageHeader
        eyebrow="Constructor de rutinas"
        title="Nueva rutina"
        description="Cargá los datos generales de la rutina."
      />
      <RoutineForm
        idPrefix="new-routine"
        onSubmit={handleSubmit}
        onCancel={() => navigate(paths.routines)}
        submitLabel="Crear rutina"
      />
    </div>
  )
}
