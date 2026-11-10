import { useState } from 'react'
import { isApiError } from '../../../lib/api'
import { useAssignments } from '../../../lib/assignments'
import { formatIsoDate } from '../../../lib/iso-date'
import { routineDetailPath } from '../../../router/paths'
import { OutlineButton } from '../../../ui/button'
import { Badge } from '../../../ui/badge'
import { Callout } from '../../../ui/callout'
import { SectionCard } from '../../../ui/card'
import { EmptyState } from '../../../ui/empty-state'
import { ClipboardList, History, RotateCw } from '../../../ui/icons'
import { ListItem } from '../../../ui/list-item'
import { Pagination } from '../../../ui/pagination'
import { Skeleton } from '../../../ui/skeleton'
import { TextLink } from '../../../ui/text-link'
import { ASSIGNMENTS_PAGE_SIZE } from '../hooks/use-active-assignment'

type RoutineHistorySectionProps = { athleteId: string }

const TITLE = 'Historial de rutinas'

const formatAssignmentsCount = (count: number) =>
  count === 1 ? '1 asignación' : `${count} asignaciones`

// todas las rutinas que se le asignaron: la activa primero y después de la más reciente a la
// más antigua (orden del backend). La primera página es la misma que usa la rutina activa
export function RoutineHistorySection({
  athleteId,
}: RoutineHistorySectionProps) {
  // desde 1, como la ve el usuario
  const [page, setPage] = useState(1)
  const { data, error, isPending, isFetching, isPlaceholderData, refetch } =
    useAssignments(athleteId, { page: page - 1, size: ASSIGNMENTS_PAGE_SIZE })

  const content = () => {
    if (error) {
      return (
        <div className="flex flex-col items-start gap-3">
          <Callout tone="danger" className="self-stretch">
            No se pudo cargar el historial de rutinas.{' '}
            {isApiError(error) ? error.message : ''}
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
          aria-label="Cargando historial de rutinas"
          className="flex flex-col gap-2"
        >
          <Skeleton className="h-12 motion-reduce:animate-none" />
          <Skeleton className="h-12 motion-reduce:animate-none" />
        </div>
      )
    }

    if (data.content.length === 0) {
      return (
        <EmptyState
          size="sm"
          icon={<ClipboardList />}
          title="Sin rutinas asignadas"
          description="Cuando le asignes una rutina, la vas a ver acá."
        />
      )
    }

    return (
      <div className="flex flex-col gap-4">
        <ul aria-label="Rutinas asignadas" aria-busy={isPlaceholderData}>
          {data.content.map((assignment) => (
            <ListItem
              key={assignment.id}
              aria-label={assignment.routineName}
              title={
                <TextLink to={routineDetailPath(assignment.routineId)}>
                  {assignment.routineName}
                </TextLink>
              }
              meta={
                <>
                  Asignada el{' '}
                  <time dateTime={assignment.assignmentDate}>
                    {formatIsoDate(assignment.assignmentDate)}
                  </time>
                </>
              }
              trailing={
                <Badge tone={assignment.active ? 'success' : 'neutral'} dot>
                  {assignment.active ? 'Activa' : 'Inactiva'}
                </Badge>
              }
            />
          ))}
        </ul>
        <Pagination
          page={page}
          totalPages={data.totalPages}
          onPageChange={setPage}
          summary={formatAssignmentsCount(data.totalElements)}
          disabled={isPlaceholderData}
        />
      </div>
    )
  }

  return (
    <SectionCard title={TITLE} icon={<History />} aria-label={TITLE}>
      {content()}
    </SectionCard>
  )
}
