import { useState, type KeyboardEvent } from 'react'
import type { ExercisePickerProps } from '../../../components/routine-structure-form'
import { isApiError } from '../../../lib/api'
import {
  groupByRegion,
  isMuscleGroupCode,
  muscleGroupName,
  type Exercise,
  type MuscleGroup,
  type MuscleGroupCode,
} from '../../../lib/exercises'
import { useDebouncedValue } from '../../../lib/use-debounced-value'
import { OutlineButton } from '../../../ui/button'
import { Callout } from '../../../ui/callout'
import { IconButton } from '../../../ui/icon-button'
import { Plus, RotateCw, X } from '../../../ui/icons'
import { SearchInput } from '../../../ui/input'
import { FilterSelect } from '../../../ui/select'
import { Skeleton } from '../../../ui/skeleton'
import { useExerciseSearch } from '../hooks/use-exercise-search'

type ExercisePickerComponentProps = ExercisePickerProps & {
  muscleGroups?: MuscleGroup[]
}

// buscador del catálogo dentro de un día. Queda abierto para agregar varios seguidos:
// Enter agrega el primer resultado y Escape lo cierra
export function ExercisePicker({
  onPick,
  onClose,
  muscleGroups,
}: ExercisePickerComponentProps) {
  const [name, setName] = useState('')
  const [muscleGroup, setMuscleGroup] = useState<MuscleGroupCode>()
  const [lastPicked, setLastPicked] = useState<string>()
  const debouncedName = useDebouncedValue(name)
  const { data, error, isPending, isFetching, isPlaceholderData, refetch } =
    useExerciseSearch({
      name: debouncedName,
      muscleGroup,
    })

  const results = data?.content ?? []

  const pick = (exercise: Exercise) => {
    onPick(exercise)
    setLastPicked(exercise.name)
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault()
      onClose()
    }
  }

  // la lista todavía es la de una búsqueda anterior (debounce o pedido en curso)
  const isStale = name !== debouncedName || isPlaceholderData

  // Enter en el buscador no envía el formulario de la estructura: agrega el primer resultado,
  // pero solo si corresponde a lo escrito
  const handleSearchKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== 'Enter') return
    event.preventDefault()
    if (!isStale && results[0]) pick(results[0])
  }

  return (
    <div
      role="group"
      aria-label="Agregar ejercicio"
      onKeyDown={handleKeyDown}
      className="rounded-control border-primary-soft-strong bg-surface flex flex-col gap-3 border p-3 sm:p-4"
    >
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold">Agregar ejercicio</h3>
        <IconButton aria-label="Cerrar buscador" onClick={onClose}>
          <X aria-hidden="true" />
        </IconButton>
      </div>
      <div role="search" className="flex flex-wrap gap-3">
        <SearchInput
          aria-label="Buscar ejercicio"
          placeholder="Buscar por nombre..."
          // se abre para buscar: el foco va directo al buscador
          autoFocus
          maxLength={100}
          value={name}
          onChange={(event) => setName(event.target.value)}
          onKeyDown={handleSearchKeyDown}
          className="min-w-0 flex-1 basis-56"
        />
        <FilterSelect
          label="Grupo"
          value={muscleGroup ?? ''}
          onChange={({ target: { value } }) =>
            setMuscleGroup(isMuscleGroupCode(value) ? value : undefined)
          }
        >
          <option value="">Todos</option>
          {groupByRegion(muscleGroups ?? []).map(
            ({ region, label, groups }) => (
              <optgroup key={region} label={label}>
                {groups.map(({ code, name }) => (
                  <option key={code} value={code}>
                    {name}
                  </option>
                ))}
              </optgroup>
            ),
          )}
        </FilterSelect>
      </div>

      {error ? (
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
          aria-label="Buscando ejercicios"
          className="flex flex-col gap-2"
        >
          <Skeleton className="h-10" />
          <Skeleton className="h-10" />
          <Skeleton className="h-10" />
        </div>
      ) : results.length === 0 ? (
        <p className="text-muted-foreground py-2 text-sm">
          No hay ejercicios que coincidan con la búsqueda.
        </p>
      ) : (
        <>
          <ul
            aria-label="Resultados"
            aria-busy={isStale}
            className="divide-border-subtle flex max-h-72 flex-col divide-y overflow-y-auto"
          >
            {results.map((exercise) => (
              <li key={exercise.id}>
                <button
                  type="button"
                  aria-label={`Agregar ${exercise.name}`}
                  onClick={() => pick(exercise)}
                  className="hover:bg-muted focus-visible:ring-ring flex min-h-11 w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors focus-visible:ring-2 focus-visible:outline-none"
                >
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-sm font-semibold">
                      {exercise.name}
                    </span>
                    <span className="text-muted-foreground text-xs">
                      {muscleGroupName(muscleGroups, exercise.muscleGroup)}
                    </span>
                  </span>
                  <Plus aria-hidden="true" className="text-primary size-5" />
                </button>
              </li>
            ))}
          </ul>
          {data && data.totalElements > results.length && (
            <p className="text-muted-foreground text-xs">
              Se muestran {results.length} de {data.totalElements}. Refiná la
              búsqueda para encontrar otros.
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
