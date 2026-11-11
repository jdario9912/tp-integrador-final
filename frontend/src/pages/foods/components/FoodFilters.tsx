import { SearchInput } from '../../../ui/input'
import { NAME_MAX_LENGTH } from '../foods-search-params'

type FoodFiltersProps = {
  name: string
  onNameChange: (name: string) => void
}

export function FoodFilters({ name, onNameChange }: FoodFiltersProps) {
  return (
    <div role="search" className="flex flex-wrap gap-3">
      <SearchInput
        aria-label="Buscar por nombre"
        placeholder="Buscar alimentos por nombre..."
        maxLength={NAME_MAX_LENGTH}
        value={name}
        onChange={(event) => onNameChange(event.target.value)}
        className="max-w-105 min-w-0 flex-1 basis-70"
      />
    </div>
  )
}
