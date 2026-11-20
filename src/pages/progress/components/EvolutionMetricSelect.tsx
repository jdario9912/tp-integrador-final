import { FormField } from '../../../ui/form-field'
import { Select } from '../../../ui/select'
import { EVOLUTION_METRIC_ID } from '../element-ids'
import type { EvolutionMetricOption } from '../body-measurement-evolution'

type EvolutionMetricSelectProps = {
  // clave de la métrica elegida (WEIGHT_METRIC_KEY para el peso)
  value: string
  options: EvolutionMetricOption[]
  onChange: (value: string) => void
}

// US-45 (F3): elige qué se grafica: el peso o cada medida y lado del catálogo
export function EvolutionMetricSelect({
  value,
  options,
  onChange,
}: EvolutionMetricSelectProps) {
  return (
    <FormField label="Medida" htmlFor={EVOLUTION_METRIC_ID}>
      <Select
        id={EVOLUTION_METRIC_ID}
        name="metric"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </Select>
    </FormField>
  )
}
