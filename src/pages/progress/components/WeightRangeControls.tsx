import { useState, type FormEvent } from 'react'
import { FormField, getFieldErrorId } from '../../../ui/form-field'
import { PrimaryButton } from '../../../ui/button'
import { DateInput } from '../../../ui/input'
import { SegmentedControl } from '../../../ui/segmented-control'
import {
  RANGE_PRESETS,
  rangeOfPreset,
  validateRange,
  type RangeFieldError,
  type RangePreset,
  type WeightRange,
} from '../weight-range'

type RangeChoice = RangePreset | 'custom'

// los atajos y, al final, "Personalizado": muestra las fechas para elegir un rango propio
const CHOICES: { value: RangeChoice; label: string }[] = [
  ...RANGE_PRESETS,
  { value: 'custom', label: 'Personalizado' },
]

const FROM_ID = 'weight-range-from'
const TO_ID = 'weight-range-to'

type WeightRangeControlsProps = {
  range: WeightRange
  // atajo que corresponde al rango de la URL; 'custom' si no coincide con ninguno
  preset: RangeChoice
  today: string
  onChange: (range: WeightRange) => void
}

// elige el rango del gráfico: atajos, o fechas propias que se validan antes de aplicarse
export function WeightRangeControls({
  range,
  preset,
  today,
  onChange,
}: WeightRangeControlsProps) {
  const rangeKey = `${range.from ?? ''}|${range.to ?? ''}`
  const [showCustom, setShowCustom] = useState(false)
  const [draft, setDraft] = useState({
    from: range.from ?? '',
    to: range.to ?? '',
  })
  const [fieldError, setFieldError] = useState<RangeFieldError>()
  const [syncedKey, setSyncedKey] = useState(rangeKey)

  // el formulario sigue al rango de la URL (atajo, atrás, enlace compartido). Se ajusta durante
  // el render, no en un efecto, para no renderizar dos veces
  if (syncedKey !== rangeKey) {
    setSyncedKey(rangeKey)
    setDraft({ from: range.from ?? '', to: range.to ?? '' })
    setFieldError(undefined)
    setShowCustom(false)
  }

  const selected: RangeChoice =
    preset === 'custom' || showCustom ? 'custom' : preset

  const choose = (choice: RangeChoice) => {
    if (choice === 'custom') {
      setShowCustom(true)
      return
    }
    setFieldError(undefined)
    setShowCustom(false)
    onChange(rangeOfPreset(choice, today))
  }

  const apply = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const next: WeightRange = {
      from: draft.from || undefined,
      to: draft.to || undefined,
    }
    const error = validateRange(next)
    setFieldError(error)
    if (error) {
      document.getElementById(error.field === 'from' ? FROM_ID : TO_ID)?.focus()
      return
    }
    onChange(next)
  }

  const errorFor = (field: RangeFieldError['field']) =>
    fieldError?.field === field ? fieldError.message : undefined

  return (
    <div className="flex flex-col gap-4">
      <SegmentedControl
        legend="Rango del gráfico"
        name="weight-range"
        variant="chips"
        options={CHOICES}
        value={selected}
        onValueChange={choose}
      />

      {selected === 'custom' && (
        <form
          noValidate
          aria-label="Rango personalizado"
          onSubmit={apply}
          className="grid grid-cols-1 items-end gap-4 sm:grid-cols-[1fr_1fr_auto]"
        >
          <FormField label="Desde" htmlFor={FROM_ID} error={errorFor('from')}>
            <DateInput
              id={FROM_ID}
              name="from"
              value={draft.from}
              aria-invalid={errorFor('from') ? true : undefined}
              aria-describedby={
                errorFor('from') ? getFieldErrorId(FROM_ID) : undefined
              }
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  from: event.target.value,
                }))
              }
            />
          </FormField>
          <FormField label="Hasta" htmlFor={TO_ID} error={errorFor('to')}>
            <DateInput
              id={TO_ID}
              name="to"
              value={draft.to}
              aria-invalid={errorFor('to') ? true : undefined}
              aria-describedby={
                errorFor('to') ? getFieldErrorId(TO_ID) : undefined
              }
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  to: event.target.value,
                }))
              }
            />
          </FormField>
          <PrimaryButton type="submit">Aplicar rango</PrimaryButton>
        </form>
      )}
    </div>
  )
}
