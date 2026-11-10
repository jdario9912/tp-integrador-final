import { useEffect, useState } from 'react'
import {
  RoutineUnavailable,
  unavailableReason,
} from '../../components/routine-unavailable'
import { PageHeader } from '../../layout'
import { isApiError } from '../../lib/api'
import { useMuscleGroups } from '../../lib/exercises'
import { useLocation, useNavigate, useParams } from '../../lib/navigation'
import {
  formatCreatedAt,
  useDuplicateRoutine,
  useRoutine,
} from '../../lib/routines'
import {
  athleteProfilePath,
  paths,
  routineDetailPath,
  routineEditPath,
  routineStructurePath,
} from '../../router/paths'
import { Badge } from '../../ui/badge'
import { OutlineButton, PrimaryButton } from '../../ui/button'
import { Callout } from '../../ui/callout'
import {
  ArrowLeft,
  Copy,
  ListOrdered,
  Pencil,
  RotateCw,
  UserPlus,
} from '../../ui/icons'
import { Skeleton } from '../../ui/skeleton'
import { TextLink } from '../../ui/text-link'
import {
  AssignRoutineToAthletePanel,
  type AssignedAthlete,
} from './components/AssignRoutineToAthletePanel'
import { RoutineDetails } from './components/RoutineDetails'
import { RoutineStructureSection } from './components/RoutineStructureSection'

const errorMessage = (error: Error) =>
  isApiError(error)
    ? error.message
    : 'Ocurrió un error inesperado. Intentá nuevamente.'

// aviso al llegar desde el alta, la edición, la estructura o al duplicar
type RoutineDetailLocationState = { notice?: string }

export function RoutineDetailPage() {
  const { id = '' } = useParams()
  // al duplicar se navega al detalle de la copia sin cambiar de ruta: con la key se vuelve a
  // montar y lee el aviso de la copia
  return <RoutineDetail key={id} id={id} />
}

function RoutineDetail({ id }: { id: string }) {
  const navigate = useNavigate()
  const location = useLocation()
  const { data: routine, error, isFetching, refetch } = useRoutine(id)
  const { data: muscleGroups } = useMuscleGroups()
  const duplicateRoutine = useDuplicateRoutine()
  const [isAssigning, setIsAssigning] = useState(false)
  const [assignedTo, setAssignedTo] = useState<AssignedAthlete>()

  // se lee una sola vez y se limpia el state: si no, vuelve a aparecer al recargar
  const [notice] = useState(
    () => (location.state as RoutineDetailLocationState | null)?.notice,
  )
  useEffect(() => {
    if (location.state) {
      navigate(location.pathname, { replace: true, state: null })
    }
  }, [location.pathname, location.state, navigate])

  const reason = error ? unavailableReason(error) : undefined
  if (reason) return <RoutineUnavailable reason={reason} />

  const backLink = (
    <TextLink
      to={paths.routines}
      className="text-muted-foreground hover:text-primary self-start"
    >
      <ArrowLeft aria-hidden="true" /> Volver a rutinas
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
      </div>
    )
  }

  // va al detalle de la copia con el aviso; el error lo muestra la página
  const handleDuplicate = async () => {
    try {
      const copy = await duplicateRoutine.mutateAsync(routine.id)
      navigate(routineDetailPath(copy.id), {
        state: { notice: `Creaste ${copy.name}.` },
      })
    } catch {
      // lo muestra la página con el error de la mutación
    }
  }

  return (
    <div className="flex max-w-265 flex-col gap-6">
      {backLink}
      {notice && (
        <Callout tone="success" role="status">
          {notice}
        </Callout>
      )}
      <PageHeader
        eyebrow="Constructor de rutinas"
        title={routine.name}
        description={
          <span className="flex flex-wrap items-center gap-x-3 gap-y-2">
            Creada el {formatCreatedAt(routine.createdAt)}
            {routine.isTemplate && <Badge tone="info">Plantilla</Badge>}
          </span>
        }
        actions={
          <>
            <OutlineButton
              onClick={() => navigate(routineEditPath(routine.id))}
            >
              <Pencil aria-hidden="true" /> Editar
            </OutlineButton>
            <OutlineButton
              disabled={duplicateRoutine.isPending}
              onClick={() => void handleDuplicate()}
            >
              <Copy aria-hidden="true" />
              {duplicateRoutine.isPending ? 'Duplicando…' : 'Duplicar'}
            </OutlineButton>
            <OutlineButton
              aria-expanded={isAssigning}
              onClick={() => {
                setAssignedTo(undefined)
                setIsAssigning(true)
              }}
            >
              <UserPlus aria-hidden="true" /> Asignar a atleta
            </OutlineButton>
            <PrimaryButton
              onClick={() => navigate(routineStructurePath(routine.id))}
            >
              <ListOrdered aria-hidden="true" /> Configurar estructura
            </PrimaryButton>
          </>
        }
      />
      {duplicateRoutine.error && (
        <Callout tone="danger">{errorMessage(duplicateRoutine.error)}</Callout>
      )}
      {assignedTo && (
        <Callout tone="success" role="status">
          Asignaste la rutina a {assignedTo.name}.{' '}
          <TextLink to={athleteProfilePath(assignedTo.id)}>
            Ver ficha de {assignedTo.name}
          </TextLink>
        </Callout>
      )}
      {isAssigning && (
        <AssignRoutineToAthletePanel
          routine={routine}
          onAssigned={(athlete) => {
            setIsAssigning(false)
            setAssignedTo(athlete)
          }}
          onClose={() => setIsAssigning(false)}
        />
      )}
      <RoutineDetails routine={routine} />
      <RoutineStructureSection
        routineId={routine.id}
        days={routine.days}
        muscleGroups={muscleGroups}
      />
    </div>
  )
}
