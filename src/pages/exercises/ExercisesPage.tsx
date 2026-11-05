import { useEffect, useMemo, useState } from 'react'
import { PageHeader } from '../../layout'
import { useMuscleGroups, type MuscleGroupCode } from '../../lib/exercises'
import { useLocation, useNavigate, useSearchParams } from '../../lib/navigation'
import { useDebouncedValue } from '../../lib/use-debounced-value'
import { paths } from '../../router/paths'
import { PrimaryButton } from '../../ui/button'
import { Callout } from '../../ui/callout'
import { Plus } from '../../ui/icons'
import { Pagination } from '../../ui/pagination'
import { ExerciseFilters } from './components/ExerciseFilters'
import { ExercisesList } from './components/ExercisesList'
import {
  parseExerciseFilters,
  toExerciseSearchParams,
} from './exercises-search-params'
import { useExercises } from './hooks/use-exercises'

const exercisesCount = (total: number) =>
  total === 1 ? '1 ejercicio' : `${total} ejercicios`

// aviso del alta, la edición o la baja de un ejercicio al volver al listado
type ExercisesLocationState = { notice?: string }

export function ExercisesPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()

  // se lee una sola vez y se limpia el state: si no, vuelve a aparecer al recargar
  const [notice] = useState(
    () => (location.state as ExercisesLocationState | null)?.notice,
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
    () => parseExerciseFilters(searchParams),
    [searchParams],
  )

  // el nombre se escribe libremente y llega a la URL (y a la API) con debounce
  const [name, setName] = useState(filters.name ?? '')
  const debouncedName = useDebouncedValue(name)

  // si la URL cambia desde afuera (atrás/adelante del navegador) el input la sigue;
  // se compara sin espacios para no pisar lo que se está escribiendo
  const [urlName, setUrlName] = useState(filters.name)
  if (filters.name !== urlName) {
    setUrlName(filters.name)
    if (name.trim() !== (filters.name ?? '')) setName(filters.name ?? '')
  }

  useEffect(() => {
    // solo con el valor ya estable: evita reescribir la URL vieja justo después de volver atrás
    if (debouncedName !== name) return
    const nextName = debouncedName.trim() || undefined
    if (nextName === filters.name) return
    // una búsqueda nueva vuelve a la primera página; replace para no llenar el historial
    setSearchParams(
      toExerciseSearchParams({ ...filters, page: 1, name: nextName }),
      { replace: true },
    )
  }, [debouncedName, name, filters, setSearchParams])

  // el select no necesita debounce: cada cambio es una elección completa
  const changeMuscleGroup = (muscleGroup?: MuscleGroupCode) =>
    setSearchParams(
      toExerciseSearchParams({ ...filters, page: 1, muscleGroup }),
      { replace: true },
    )

  const { data: muscleGroups } = useMuscleGroups()
  const { data, error, isPending, isPlaceholderData, refetch } =
    useExercises(filters)

  // un link viejo o la baja de ejercicios pueden dejar la página fuera de rango
  const lastPage = Math.max(data?.totalPages ?? 1, 1)
  const isOutOfRange = !!data && !isPlaceholderData && filters.page > lastPage
  useEffect(() => {
    if (isOutOfRange) {
      setSearchParams(toExerciseSearchParams({ ...filters, page: lastPage }), {
        replace: true,
      })
    }
  }, [isOutOfRange, filters, lastPage, setSearchParams])

  const changePage = (page: number) =>
    setSearchParams(toExerciseSearchParams({ ...filters, page }))

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Ejercicios"
        description="Catálogo de ejercicios del sistema y los que creaste para tus rutinas."
        actions={
          <PrimaryButton onClick={() => navigate(paths.newExercise)}>
            <Plus aria-hidden="true" /> Nuevo ejercicio
          </PrimaryButton>
        }
      />
      {notice && (
        <Callout tone="success" role="status">
          {notice}
        </Callout>
      )}
      <ExerciseFilters
        name={name}
        muscleGroup={filters.muscleGroup}
        muscleGroups={muscleGroups}
        onNameChange={setName}
        onMuscleGroupChange={changeMuscleGroup}
      />
      <ExercisesList
        exercises={isOutOfRange ? undefined : data?.content}
        muscleGroups={muscleGroups}
        isPending={isPending}
        isUpdating={isPlaceholderData}
        error={error}
        hasFilters={!!(filters.name || filters.muscleGroup)}
        onRetry={() => void refetch()}
      />
      {data && !error && !isOutOfRange && (
        <Pagination
          page={filters.page}
          totalPages={data.totalPages}
          onPageChange={changePage}
          summary={exercisesCount(data.totalElements)}
          disabled={isPlaceholderData}
        />
      )}
    </div>
  )
}
