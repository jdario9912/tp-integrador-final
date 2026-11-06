import { useEffect, useMemo } from 'react'
import { PageHeader } from '../../layout'
import { useNavigate, useSearchParams } from '../../lib/navigation'
import { paths } from '../../router/paths'
import { PrimaryButton } from '../../ui/button'
import { Plus } from '../../ui/icons'
import { Pagination } from '../../ui/pagination'
import { RoutinesList } from './components/RoutinesList'
import { useRoutines } from './hooks/use-routines'
import {
  parseRoutinesQuery,
  toRoutinesSearchParams,
} from './routines-search-params'

const routinesCount = (total: number) =>
  total === 1 ? '1 rutina' : `${total} rutinas`

export function RoutinesPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const query = useMemo(() => parseRoutinesQuery(searchParams), [searchParams])

  const { data, error, isPending, isPlaceholderData, refetch } =
    useRoutines(query)

  // un link viejo puede dejar la página fuera de rango
  const lastPage = Math.max(data?.totalPages ?? 1, 1)
  const isOutOfRange = !!data && !isPlaceholderData && query.page > lastPage
  useEffect(() => {
    if (isOutOfRange) {
      setSearchParams(toRoutinesSearchParams({ page: lastPage }), {
        replace: true,
      })
    }
  }, [isOutOfRange, lastPage, setSearchParams])

  const changePage = (page: number) =>
    setSearchParams(toRoutinesSearchParams({ page }))

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Constructor de rutinas"
        title="Mis rutinas"
        description="Las rutinas que armaste para tus atletas y tus plantillas."
        actions={
          <PrimaryButton onClick={() => navigate(paths.newRoutine)}>
            <Plus aria-hidden="true" /> Nueva rutina
          </PrimaryButton>
        }
      />
      <RoutinesList
        routines={isOutOfRange ? undefined : data?.content}
        isPending={isPending}
        isUpdating={isPlaceholderData}
        error={error}
        onRetry={() => void refetch()}
      />
      {data && !error && !isOutOfRange && (
        <Pagination
          page={query.page}
          totalPages={data.totalPages}
          onPageChange={changePage}
          summary={routinesCount(data.totalElements)}
          disabled={isPlaceholderData}
        />
      )}
    </div>
  )
}
