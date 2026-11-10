import { useState } from 'react'
import {
  AssignRoutineForm,
  ROUTINE_REQUIRED_MESSAGE,
  type AssignOption,
} from '../../../components/assign-routine-form'
import { isApiError } from '../../../lib/api'
import {
  useAssignRoutineFlow,
  type RoutineAssignment,
} from '../../../lib/assignments'
import { formatIsoDate } from '../../../lib/iso-date'
import type { Routine } from '../../../lib/routines'
import {
  paths,
  routineDetailPath,
  routineStructurePath,
} from '../../../router/paths'
import { OutlineButton } from '../../../ui/button'
import { Callout } from '../../../ui/callout'
import { SectionCard } from '../../../ui/card'
import { ConfirmDialog } from '../../../ui/confirm-dialog'
import { EmptyState } from '../../../ui/empty-state'
import { ClipboardList, Dumbbell, RotateCw } from '../../../ui/icons'
import { Skeleton } from '../../../ui/skeleton'
import { TextLink } from '../../../ui/text-link'
import { useActiveAssignment } from '../hooks/use-active-assignment'
import { useRoutineOptions } from '../hooks/use-routine-options'

type ActiveRoutineSectionProps = {
  athleteId: string
  // false = cuenta desactivada: el backend no le asigna rutinas (422)
  athleteActive: boolean
}

const TITLE = 'Rutina activa'

const errorMessage = (error: Error) =>
  isApiError(error)
    ? error.message
    : 'Ocurrió un error inesperado. Intentá nuevamente.'

// la activa aparece en el selector pero no se puede elegir: el backend respondería 422
const toRoutineOptions = (
  routines: Routine[],
  activeRoutineId?: string,
): AssignOption[] =>
  routines.map(({ id, name }) =>
    id === activeRoutineId
      ? { value: id, label: `${name} (activa)`, disabled: true }
      : { value: id, label: name },
  )

// rutina activa del atleta y asignación de una rutina (US-16). Una sola activa: si ya tiene
// otra, el backend responde 409 y se pide confirmar el reemplazo
export function ActiveRoutineSection({
  athleteId,
  athleteActive,
}: ActiveRoutineSectionProps) {
  const { activeAssignment, error, isPending, isFetching, refetch } =
    useActiveAssignment(athleteId)
  const [isOpen, setIsOpen] = useState(false)
  const [selectedRoutineId, setSelectedRoutineId] = useState<string>()
  const [notice, setNotice] = useState<string>()
  const routineOptions = useRoutineOptions({ enabled: isOpen })
  const flow = useAssignRoutineFlow({
    onAssigned: (assignment) => {
      setIsOpen(false)
      setNotice(`Asignaste la rutina ${assignment.routineName}.`)
    },
  })

  const open = () => {
    setNotice(undefined)
    setIsOpen(true)
  }

  const close = () => {
    flow.reset()
    setIsOpen(false)
  }

  const assign = (routineId: string) => {
    setSelectedRoutineId(routineId)
    return flow.assign(athleteId, routineId)
  }

  // con la cuenta activa y otra rutina elegida, el único 422 posible es la rutina incompleta
  const incompleteRoutineId =
    isApiError(flow.error) &&
    flow.error.status === 422 &&
    athleteActive &&
    selectedRoutineId !== activeAssignment?.routineId
      ? selectedRoutineId
      : undefined

  const assignButton = (
    <OutlineButton size="sm" disabled={!athleteActive} onClick={open}>
      {activeAssignment ? 'Cambiar rutina' : 'Asignar rutina'}
    </OutlineButton>
  )

  const current = (assignment: RoutineAssignment | null) =>
    assignment ? (
      <div className="flex flex-col gap-1">
        <TextLink
          to={routineDetailPath(assignment.routineId)}
          className="self-start text-base break-words"
        >
          {assignment.routineName}
        </TextLink>
        <p className="text-muted-foreground text-sm">
          Asignada el{' '}
          <time dateTime={assignment.assignmentDate}>
            {formatIsoDate(assignment.assignmentDate)}
          </time>
          .
        </p>
      </div>
    ) : (
      <EmptyState
        size="sm"
        icon={<Dumbbell />}
        title="Sin rutina asignada"
        description="Todavía no tiene una rutina activa."
      />
    )

  const content = () => {
    if (error) {
      return (
        <div className="flex flex-col items-start gap-3">
          <Callout tone="danger" className="self-stretch">
            No se pudo cargar la rutina activa. {errorMessage(error)}
          </Callout>
          <OutlineButton
            size="sm"
            disabled={isFetching}
            onClick={() => void refetch()}
          >
            <RotateCw aria-hidden="true" />
            {isFetching ? 'Reintentando...' : 'Reintentar'}
          </OutlineButton>
        </div>
      )
    }

    if (isPending) {
      return (
        <div
          role="status"
          aria-label="Cargando rutina activa"
          className="flex flex-col gap-2"
        >
          <Skeleton className="h-5 w-40 motion-reduce:animate-none" />
          <Skeleton className="h-4 w-48 motion-reduce:animate-none" />
        </div>
      )
    }

    const routines = routineOptions.data
    const hiddenRoutines =
      routines && routines.totalElements > routines.content.length

    return (
      <div className="flex flex-col gap-4">
        {notice && (
          <Callout tone="success" role="status">
            {notice}
          </Callout>
        )}
        {current(activeAssignment)}
        {isOpen ? (
          <div className="border-border-subtle flex flex-col gap-4 border-t pt-4">
            <AssignRoutineForm
              idPrefix={`assign-routine-${athleteId}`}
              label="Rutina"
              placeholder="Seleccioná una rutina"
              requiredMessage={ROUTINE_REQUIRED_MESSAGE}
              options={toRoutineOptions(
                routines?.content ?? [],
                activeAssignment?.routineId,
              )}
              isLoadingOptions={routineOptions.isPending}
              optionsError={
                routineOptions.error
                  ? `No se pudieron cargar las rutinas. ${errorMessage(routineOptions.error)}`
                  : undefined
              }
              onRetryOptions={() => void routineOptions.refetch()}
              emptyMessage={
                <>
                  Todavía no creaste rutinas.{' '}
                  <TextLink to={paths.newRoutine}>Crear rutina</TextLink>
                </>
              }
              hint={
                hiddenRoutines
                  ? `Se muestran las primeras ${routines.content.length} de ${routines.totalElements} rutinas.`
                  : undefined
              }
              onSubmit={assign}
              onCancel={close}
              isPending={flow.isPending}
            />
            {flow.error && (
              <Callout tone="danger">
                {errorMessage(flow.error)}
                {incompleteRoutineId && (
                  <>
                    {' '}
                    <TextLink to={routineStructurePath(incompleteRoutineId)}>
                      Configurar estructura
                    </TextLink>
                  </>
                )}
              </Callout>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-start gap-2">
            {assignButton}
            {!athleteActive && (
              <p className="text-muted-foreground text-sm">
                La cuenta está desactivada: reactivala para asignarle una
                rutina.
              </p>
            )}
          </div>
        )}
      </div>
    )
  }

  return (
    <SectionCard title={TITLE} icon={<ClipboardList />} aria-label={TITLE}>
      {content()}
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
