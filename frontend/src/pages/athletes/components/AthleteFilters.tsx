import { GOAL_MAX_LENGTH, NAME_MAX_LENGTH } from '../athletes-search-params'
import { SearchInput } from '../../../ui/input'

type AthleteFiltersProps = {
  name: string
  goal: string
  onNameChange: (name: string) => void
  onGoalChange: (goal: string) => void
}

// dos búsquedas porque el backend combina nombre y objetivo con AND
export function AthleteFilters({
  name,
  goal,
  onNameChange,
  onGoalChange,
}: AthleteFiltersProps) {
  return (
    <div role="search" className="flex flex-wrap gap-3">
      <SearchInput
        aria-label="Buscar por nombre"
        placeholder="Buscar atletas por nombre..."
        maxLength={NAME_MAX_LENGTH}
        value={name}
        onChange={(event) => onNameChange(event.target.value)}
        className="max-w-105 min-w-0 flex-1 basis-70"
      />
      <SearchInput
        aria-label="Buscar por objetivo"
        placeholder="Buscar por objetivo..."
        maxLength={GOAL_MAX_LENGTH}
        value={goal}
        onChange={(event) => onGoalChange(event.target.value)}
        className="max-w-105 min-w-0 flex-1 basis-70"
      />
    </div>
  )
}
