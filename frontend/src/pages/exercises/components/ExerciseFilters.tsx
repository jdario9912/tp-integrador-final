import {
  groupByRegion,
  isMuscleGroupCode,
  type MuscleGroup,
  type MuscleGroupCode,
} from '../../../lib/exercises'
import { SearchInput } from '../../../ui/input'
import { FilterSelect } from '../../../ui/select'
import { NAME_MAX_LENGTH } from '../exercises-search-params'

type ExerciseFiltersProps = {
  name: string
  muscleGroup?: MuscleGroupCode
  // sin el catálogo cargado el select solo ofrece "Todos"
  muscleGroups?: MuscleGroup[]
  onNameChange: (name: string) => void
  onMuscleGroupChange: (muscleGroup?: MuscleGroupCode) => void
}

// el backend combina nombre y grupo muscular con AND
export function ExerciseFilters({
  name,
  muscleGroup,
  muscleGroups = [],
  onNameChange,
  onMuscleGroupChange,
}: ExerciseFiltersProps) {
  return (
    <div role="search" className="flex flex-wrap gap-3">
      <SearchInput
        aria-label="Buscar por nombre"
        placeholder="Buscar ejercicios por nombre..."
        maxLength={NAME_MAX_LENGTH}
        value={name}
        onChange={(event) => onNameChange(event.target.value)}
        className="max-w-105 min-w-0 flex-1 basis-70"
      />
      <FilterSelect
        label="Grupo muscular"
        value={muscleGroup ?? ''}
        onChange={({ target: { value } }) =>
          onMuscleGroupChange(isMuscleGroupCode(value) ? value : undefined)
        }
      >
        <option value="">Todos</option>
        {groupByRegion(muscleGroups).map(({ region, label, groups }) => (
          <optgroup key={region} label={label}>
            {groups.map(({ code, name }) => (
              <option key={code} value={code}>
                {name}
              </option>
            ))}
          </optgroup>
        ))}
      </FilterSelect>
    </div>
  )
}
