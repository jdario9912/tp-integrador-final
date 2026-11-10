import {
  AssignRoutineForm,
  ATHLETE_REQUIRED_MESSAGE,
  type AssignOption,
} from '../../../components/assign-routine-form'
import { isApiError } from '../../../lib/api'
import { useAssignRoutineFlow } from '../../../lib/assignments'
import type { Athlete } from '../../../lib/athletes'
import type { RoutineDetail } from '../../../lib/routines'
import { paths, routineStructurePath } from '../../../router/paths'
import { Callout } from '../../../ui/callout'
import { SectionCard } from '../../../ui/card'
import { ConfirmDialog } from '../../../ui/confirm-dialog'
import { UserPlus } from '../../../ui/icons'
import { TextLink } from '../../../ui/text-link'
import { useAthleteOptions } from '../hooks/use-athlete-options'

export type AssignedAthlete = { id: string; name: string }

type AssignRoutineToAthletePanelProps = {
  routine: RoutineDetail
  onAssigned: (athlete: AssignedAthlete) => void
  onClose: () => void
}

const TITLE = 'Asignar a atleta'

const errorMessage = (error: Error) =>
  isApiError(error)
    ? error.message
    : 'Ocurrió un error inesperado. Intentá nuevamente.'

const fullName = ({ firstName, lastName }: Athlete) =>
  `${firstName} ${lastName}`

// los desactivados se ven pero no se pueden elegir: el backend respondería 422
const toAthleteOptions = (athletes: Athlete[]): AssignOption[] =>
  athletes.map((athlete) =>
    athlete.active
      ? { value: athlete.id, label: fullName(athlete) }
      : {
          value: athlete.id,
          label: `${fullName(athlete)} (cuenta desactivada)`,
          disabled: true,
        },
  )

// el backend exige al menos un día y ningún día sin ejercicios para asignarla
const isRoutineComplete = ({ days }: RoutineDetail) =>
  days.length > 0 && days.every((day) => day.exercises.length > 0)

// panel en línea del detalle de la rutina para elegir a qué atleta asignarla (US-16)
export function AssignRoutineToAthletePanel({
  routine,
  onAssigned,
  onClose,
}: AssignRoutineToAthletePanelProps) {
  const athleteOptions = useAthleteOptions()
  const athletes = athleteOptions.data
  const flow = useAssignRoutineFlow({
    onAssigned: (_assignment, athleteId) => {
      const athlete = athletes?.content.find(({ id }) => id === athleteId)
      onAssigned({
        id: athleteId,
        name: athlete ? fullName(athlete) : 'el atleta',
      })
    },
  })

  const close = () => {
    flow.reset()
    onClose()
  }

  // la rutina es la misma para todos: si está incompleta, el 422 es por eso
  const showStructureLink =
    isApiError(flow.error) &&
    flow.error.status === 422 &&
    !isRoutineComplete(routine)

  return (
    <SectionCard title={TITLE} icon={<UserPlus />} aria-label={TITLE}>
      <div className="flex flex-col gap-4">
        <AssignRoutineForm
          idPrefix={`assign-athlete-${routine.id}`}
          label="Atleta"
          placeholder="Seleccioná un atleta"
          requiredMessage={ATHLETE_REQUIRED_MESSAGE}
          options={toAthleteOptions(athletes?.content ?? [])}
          isLoadingOptions={athleteOptions.isPending}
          optionsError={
            athleteOptions.error
              ? `No se pudieron cargar los atletas. ${errorMessage(athleteOptions.error)}`
              : undefined
          }
          onRetryOptions={() => void athleteOptions.refetch()}
          emptyMessage={
            <>
              Todavía no tenés atletas en tu cartera.{' '}
              <TextLink to={paths.newAthlete}>Agregar atleta</TextLink>
            </>
          }
          hint={
            athletes && athletes.totalElements > athletes.content.length
              ? `Se muestran los primeros ${athletes.content.length} de ${athletes.totalElements} atletas.`
              : undefined
          }
          onSubmit={(athleteId) => flow.assign(athleteId, routine.id)}
          onCancel={close}
          isPending={flow.isPending}
        />
        {flow.error && (
          <Callout tone="danger">
            {errorMessage(flow.error)}
            {showStructureLink && (
              <>
                {' '}
                <TextLink to={routineStructurePath(routine.id)}>
                  Configurar estructura
                </TextLink>
              </>
            )}
          </Callout>
        )}
      </div>
      <ConfirmDialog
        open={flow.pendingReplace !== undefined}
        title="¿Reemplazar la rutina activa?"
        description={
          <>
            <p>{flow.pendingReplace?.message}</p>
            <p className="mt-2">
              La rutina actual pasa al historial como inactiva.
            </p>
          </>
        }
        confirmLabel="Reemplazar"
        isPending={flow.isPending}
        onConfirm={() => void flow.confirm()}
        onCancel={flow.cancel}
      />
    </SectionCard>
  )
}
