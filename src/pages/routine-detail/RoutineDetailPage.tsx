import { useEffect, useState } from 'react'
import { PageHeader } from '../../layout'
import { isApiError } from '../../lib/api'
import { useLocation, useNavigate, useParams } from '../../lib/navigation'
import { formatCreatedAt } from '../../lib/routines'
import { paths } from '../../router/paths'
import { Badge } from '../../ui/badge'
import { OutlineButton } from '../../ui/button'
import { Callout } from '../../ui/callout'
import { ArrowLeft, RotateCw } from '../../ui/icons'
import { Skeleton } from '../../ui/skeleton'
import { TextLink } from '../../ui/text-link'
import { RoutineDetails } from './components/RoutineDetails'
import {
  RoutineUnavailable,
  type UnavailableReason,
} from './components/RoutineUnavailable'
import { useRoutine } from './hooks/use-routine'

// 404: no existe. 400: el id de la URL no es un UUID, para el usuario es lo mismo.
// 403: es de otro entrenador. Ninguno cambia al reintentar
const unavailableReason = (error: Error): UnavailableReason | undefined => {
  if (!isApiError(error)) return undefined
  if (error.status === 403) return 'forbidden'
  if (error.status === 400 || error.status === 404) return 'not-found'
  return undefined
}

const errorMessage = (error: Error) =>
  isApiError(error)
    ? error.message
    : 'Ocurrió un error inesperado. Intentá nuevamente.'

// aviso del alta al llegar desde "Nueva rutina"
type RoutineDetailLocationState = { notice?: string }

export function RoutineDetailPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const { data: routine, error, isFetching, refetch } = useRoutine(id)

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
      />
      <RoutineDetails routine={routine} />
    </div>
  )
}
