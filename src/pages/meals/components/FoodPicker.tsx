import { useState, type KeyboardEvent } from 'react'
import { isApiError } from '../../../lib/api'
import type { Food } from '../../../lib/foods'
import { formatGrams, formatKcal } from '../../../lib/foods'
import { useDebouncedValue } from '../../../lib/use-debounced-value'
import { OutlineButton } from '../../../ui/button'
import { Callout } from '../../../ui/callout'
import { Plus, RotateCw } from '../../../ui/icons'
import { SearchInput } from '../../../ui/input'
import { Skeleton } from '../../../ui/skeleton'
import { FOOD_SEARCH_ID } from '../element-ids'
import { useFoodSearch } from '../hooks/use-food-search'
import { MEAL_ITEMS_MAX } from '../validation'

type FoodPickerProps = {
  onPick: (food: Food) => void
  // la comida ya tiene el máximo de alimentos: no se puede buscar más
  full: boolean
}

// buscador del catálogo dentro del formulario de la comida. Queda abierto para agregar varios:
// Enter agrega el primer resultado (y no envía el formulario)
export function FoodPicker({ onPick, full }: FoodPickerProps) {
  const [name, setName] = useState('')
  const [lastPicked, setLastPicked] = useState<string>()
  const debouncedName = useDebouncedValue(name)
  const { data, error, isPending, isFetching, isPlaceholderData, refetch } =
    useFoodSearch(debouncedName)

  const results = data?.content ?? []
  // la lista todavía es la de una búsqueda anterior (debounce o pedido en curso)
  const isStale = name !== debouncedName || isPlaceholderData

  const pick = (food: Food) => {
    onPick(food)
    setLastPicked(food.name)
  }

  const handleSearchKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== 'Enter') return
    // Enter en el buscador no envía la comida: agrega el primer resultado, si corresponde a lo escrito
    event.preventDefault()
    if (!full && !isStale && results[0]) pick(results[0])
  }

  return (
    <div
      role="group"
      aria-labelledby="meal-foods-label"
      className="flex flex-col gap-3"
    >
      <p id="meal-foods-label" className="text-sm font-semibold">
        Alimentos
      </p>
      <SearchInput
        id={FOOD_SEARCH_ID}
        aria-label="Buscar alimento"
        placeholder="Buscar alimento por nombre..."
        autoComplete="off"
        maxLength={100}
        value={name}
        disabled={full}
        onChange={(event) => setName(event.target.value)}
        onKeyDown={handleSearchKeyDown}
      />
      {full ? (
        <p className="text-muted-foreground text-sm">
          Una comida admite hasta {MEAL_ITEMS_MAX} alimentos.
        </p>
      ) : error ? (
        <div className="flex flex-col items-start gap-3">
          <Callout tone="danger" className="self-stretch">
            {isApiError(error)
              ? error.message
              : 'Ocurrió un error inesperado. Intentá nuevamente.'}
          </Callout>
          <OutlineButton
            size="sm"
            disabled={isFetching}
            onClick={() => void refetch()}
          >
            <RotateCw aria-hidden="true" /> Reintentar
          </OutlineButton>
        </div>
      ) : isPending ? (
        <div
          role="status"
          aria-label="Buscando alimentos"
          className="flex flex-col gap-2"
        >
          <Skeleton className="h-11" />
          <Skeleton className="h-11" />
          <Skeleton className="h-11" />
        </div>
      ) : results.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          No hay alimentos que coincidan con la búsqueda.
        </p>
      ) : (
        <>
          <ul
            aria-label="Alimentos encontrados"
            aria-busy={isStale}
            className="divide-border-subtle border-border-subtle flex max-h-60 flex-col divide-y overflow-y-auto rounded-control border"
          >
            {results.map((food) => (
              <li key={food.id}>
                <button
                  type="button"
                  aria-label={`Agregar ${food.name}`}
                  disabled={full}
                  onClick={() => pick(food)}
                  className="hover:bg-muted focus-visible:ring-ring flex min-h-12 w-full items-center gap-3 px-3 py-2 text-left transition-colors focus-visible:ring-2 focus-visible:outline-none disabled:opacity-50"
                >
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-sm font-semibold">
                      {food.name}
                    </span>
                    <span className="text-muted-foreground text-xs">
                      Porción {formatGrams(food.referencePortionG)} ·{' '}
                      {formatKcal(food.caloriesKcal)}
                    </span>
                  </span>
                  <Plus aria-hidden="true" className="text-primary size-5" />
                </button>
              </li>
            ))}
          </ul>
          {data && data.totalElements > results.length && (
            <p className="text-muted-foreground text-xs">
              Se muestran {results.length} de {data.totalElements}. Escribí el
              nombre para encontrar otros.
            </p>
          )}
        </>
      )}

      <p aria-live="polite" className="text-success text-sm empty:hidden">
        {lastPicked && `Agregaste ${lastPicked}.`}
      </p>
    </div>
  )
}
