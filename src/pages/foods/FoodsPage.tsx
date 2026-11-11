import { useEffect, useMemo, useState } from 'react'
import { PageHeader } from '../../layout'
import { useAuth } from '../../lib/auth'
import { useLocation, useNavigate, useSearchParams } from '../../lib/navigation'
import { useDebouncedValue } from '../../lib/use-debounced-value'
import { paths } from '../../router/paths'
import { PrimaryButton } from '../../ui/button'
import { Callout } from '../../ui/callout'
import { Plus } from '../../ui/icons'
import { Pagination } from '../../ui/pagination'
import { FoodFilters } from './components/FoodFilters'
import { FoodsList } from './components/FoodsList'
import { parseFoodFilters, toFoodSearchParams } from './foods-search-params'
import { useFoods } from './hooks/use-foods'

const foodsCount = (total: number) =>
  total === 1 ? '1 alimento' : `${total} alimentos`

// aviso del alta o la edición de un alimento al volver al listado
type FoodsLocationState = { notice?: string }

// catálogo global: lo consultan los dos roles; crear y editar es solo del entrenador
export function FoodsPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()
  const { user } = useAuth()
  const canEdit = user?.role === 'COACH'

  // se lee una sola vez y se limpia el state: si no, vuelve a aparecer al recargar
  const [notice] = useState(
    () => (location.state as FoodsLocationState | null)?.notice,
  )
  useEffect(() => {
    if (location.state) {
      // con el search: limpiar el aviso no tiene que perder la búsqueda
      navigate(location.pathname + location.search, {
        replace: true,
        state: null,
      })
    }
  }, [location.pathname, location.search, location.state, navigate])

  const filters = useMemo(() => parseFoodFilters(searchParams), [searchParams])

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
    setSearchParams(toFoodSearchParams({ page: 1, name: nextName }), {
      replace: true,
    })
  }, [debouncedName, name, filters, setSearchParams])

  const { data, error, isPending, isPlaceholderData, refetch } =
    useFoods(filters)

  // un link viejo puede dejar la página fuera de rango
  const lastPage = Math.max(data?.totalPages ?? 1, 1)
  const isOutOfRange = !!data && !isPlaceholderData && filters.page > lastPage
  useEffect(() => {
    if (isOutOfRange) {
      setSearchParams(toFoodSearchParams({ ...filters, page: lastPage }), {
        replace: true,
      })
    }
  }, [isOutOfRange, filters, lastPage, setSearchParams])

  const changePage = (page: number) =>
    setSearchParams(toFoodSearchParams({ ...filters, page }))

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Alimentos"
        description="Catálogo de alimentos con sus valores nutricionales por porción de referencia."
        actions={
          canEdit && (
            <PrimaryButton onClick={() => navigate(paths.newFood)}>
              <Plus aria-hidden="true" /> Nuevo alimento
            </PrimaryButton>
          )
        }
      />
      {notice && (
        <Callout tone="success" role="status">
          {notice}
        </Callout>
      )}
      <FoodFilters name={name} onNameChange={setName} />
      <FoodsList
        foods={isOutOfRange ? undefined : data?.content}
        isPending={isPending}
        isUpdating={isPlaceholderData}
        error={error}
        hasFilters={!!filters.name}
        canEdit={canEdit}
        onRetry={() => void refetch()}
      />
      {data && !error && !isOutOfRange && (
        <Pagination
          page={filters.page}
          totalPages={data.totalPages}
          onPageChange={changePage}
          summary={foodsCount(data.totalElements)}
          disabled={isPlaceholderData}
        />
      )}
    </div>
  )
}
