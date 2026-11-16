import { useId } from 'react'
import { GhostButton } from '../../ui/button'
import { FormField } from '../../ui/form-field'
import { DateInput } from '../../ui/input'
import { EMPTY_RANGE, type DateRange } from './date-range'

type HistoryFilterProps = {
  value: DateRange
  onChange: (next: DateRange) => void
  // error del rango (desde posterior a hasta, fecha mal formada): se muestra debajo de los campos
  error?: string
}

// rango de fechas del historial, inclusivo. Vacío = sin límite. Cada cambio aplica el filtro (si el
// rango es válido), así no hay un botón de "buscar" que olvidar
export function HistoryFilter({ value, onChange, error }: HistoryFilterProps) {
  const id = useId()
  const fromId = `${id}-from`
  const toId = `${id}-to`
  const errorId = `${id}-error`
  const hasRange = Boolean(value.from || value.to)

  return (
    <search aria-label="Filtrar por fecha" className="flex flex-col gap-3">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField label="Desde" htmlFor={fromId}>
          <DateInput
            id={fromId}
            name="from"
            max={value.to || undefined}
            value={value.from}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? errorId : undefined}
            onChange={(event) =>
              onChange({ ...value, from: event.target.value })
            }
          />
        </FormField>
        <FormField label="Hasta" htmlFor={toId}>
          <DateInput
            id={toId}
            name="to"
            min={value.from || undefined}
            value={value.to}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? errorId : undefined}
            onChange={(event) => onChange({ ...value, to: event.target.value })}
          />
        </FormField>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        {error ? (
          <p
            id={errorId}
            role="alert"
            className="text-danger text-sm font-medium"
          >
            {error}
          </p>
        ) : (
          <p className="text-muted-foreground text-sm">
            {hasRange
              ? 'Mostrando el rango elegido.'
              : 'Sin filtro de fechas: todo el historial.'}
          </p>
        )}
        {hasRange && (
          <GhostButton size="sm" onClick={() => onChange(EMPTY_RANGE)}>
            Quitar filtro de fechas
          </GhostButton>
        )}
      </div>
    </search>
  )
}
