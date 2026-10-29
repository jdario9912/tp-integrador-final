import { UserPlus } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { PageHeader } from '../../layout'
import { useDebouncedValue } from '../../lib/use-debounced-value'
import { paths } from '../../router/paths'
import { PrimaryButton } from '../../ui/button'
import { Callout } from '../../ui/callout'
import { Pagination } from '../../ui/pagination'
import {
  parseAthleteFilters,
  toAthleteSearchParams,
} from './athletes-search-params'
import { AthleteFilters } from './components/AthleteFilters'
import { AthletesList } from './components/AthletesList'
import { useAthletes } from './hooks/use-athletes'

const athletesCount = (total: number) =>
  total === 1 ? '1 atleta' : `${total} atletas`

// aviso de la edición de un atleta (guardado o desvinculado) al volver al listado
type AthletesLocationState = { notice?: string }

export function AthletesPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()

  // se lee una sola vez y se limpia el state, como en el dashboard: si no, vuelve a aparecer al recargar
  const [notice] = useState(
    () => (location.state as AthletesLocationState | null)?.notice,
  )
  useEffect(() => {
    if (location.state) {
      // con el search: limpiar el aviso no tiene que perder los filtros
      navigate(location.pathname + location.search, {
        replace: true,
        state: null,
      })
    }
  }, [location.pathname, location.search, location.state, navigate])
  const filters = useMemo(
    () => parseAthleteFilters(searchParams),
    [searchParams],
  )

  // los inputs se escriben libremente y llegan a la URL (y a la API) con debounce
  const [name, setName] = useState(filters.name ?? '')
  const [goal, setGoal] = useState(filters.goal ?? '')
  const debouncedName = useDebouncedValue(name)
  const debouncedGoal = useDebouncedValue(goal)

  // si la URL cambia desde afuera (atrás/adelante del navegador) los inputs la siguen;
  // se compara sin espacios para no pisar lo que se está escribiendo
  const [urlFilters, setUrlFilters] = useState(filters)
  if (filters.name !== urlFilters.name || filters.goal !== urlFilters.goal) {
    setUrlFilters(filters)
    if (name.trim() !== (filters.name ?? '')) setName(filters.name ?? '')
    if (goal.trim() !== (filters.goal ?? '')) setGoal(filters.goal ?? '')
  }

  useEffect(() => {
    // solo con el valor ya estable: evita reescribir la URL vieja justo después de volver atrás
    if (debouncedName !== name || debouncedGoal !== goal) return
    const nextName = debouncedName.trim() || undefined
    const nextGoal = debouncedGoal.trim() || undefined
    if (nextName === filters.name && nextGoal === filters.goal) return
    // una búsqueda nueva vuelve a la primera página; replace para no llenar el historial
    setSearchParams(
      toAthleteSearchParams({ page: 1, name: nextName, goal: nextGoal }),
      { replace: true },
    )
  }, [debouncedName, debouncedGoal, name, goal, filters, setSearchParams])

  const { data, error, isPending, isPlaceholderData, refetch } =
    useAthletes(filters)

  // un link viejo o el borrado de atletas pueden dejar la página fuera de rango
  const lastPage = Math.max(data?.totalPages ?? 1, 1)
  const isOutOfRange = !!data && !isPlaceholderData && filters.page > lastPage
  useEffect(() => {
    if (isOutOfRange) {
      setSearchParams(toAthleteSearchParams({ ...filters, page: lastPage }), {
        replace: true,
      })
    }
  }, [isOutOfRange, filters, lastPage, setSearchParams])

  const changePage = (page: number) =>
    setSearchParams(toAthleteSearchParams({ ...filters, page }))

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Atletas"
        description="Gestioná y hacé seguimiento del progreso de tus atletas."
        actions={
          <PrimaryButton onClick={() => navigate(paths.newAthlete)}>
            <UserPlus aria-hidden="true" /> Agregar atleta
          </PrimaryButton>
        }
      />
      {notice && (
        <Callout tone="success" role="status">
          {notice}
        </Callout>
      )}
      <AthleteFilters
        name={name}
        goal={goal}
        onNameChange={setName}
        onGoalChange={setGoal}
      />
      <AthletesList
        athletes={isOutOfRange ? undefined : data?.content}
        isPending={isPending}
        isUpdating={isPlaceholderData}
        error={error}
        hasFilters={!!(filters.name || filters.goal)}
        onRetry={() => void refetch()}
      />
      {data && !error && !isOutOfRange && (
        <Pagination
          page={filters.page}
          totalPages={data.totalPages}
          onPageChange={changePage}
          summary={athletesCount(data.totalElements)}
          disabled={isPlaceholderData}
        />
      )}
    </div>
  )
}
