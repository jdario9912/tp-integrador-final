import { useForm } from '@tanstack/react-form'
import type { ReactNode, SubmitEventHandler } from 'react'
import { GhostButton, OutlineButton, PrimaryButton } from '../../ui/button'
import { Callout } from '../../ui/callout'
import { FormField, getFieldErrorId, getFieldHintId } from '../../ui/form-field'
import { RotateCw } from '../../ui/icons'
import { Select } from '../../ui/select'
import { Skeleton } from '../../ui/skeleton'
import type { AssignOption, AssignRoutineFormValues } from './types'
import { validateSelection } from './validation'

type AssignRoutineFormProps = {
  // "Rutina" o "Atleta"
  label: string
  placeholder: string
  requiredMessage: string
  options: AssignOption[]
  isLoadingOptions?: boolean
  // mensaje si no se pudieron cargar las opciones
  optionsError?: string
  onRetryOptions?: () => void
  // se muestra en lugar del selector si no hay ninguna opción
  emptyMessage: ReactNode
  // texto de ayuda bajo el selector (por ejemplo, si no se muestran todas las opciones)
  hint?: string
  // los errores del pedido los muestra quien lo usa: el formulario solo valida que haya opción
  onSubmit: (selectedId: string) => Promise<void>
  onCancel: () => void
  // la confirmación del reemplazo sigue en curso aunque el submit ya haya terminado
  isPending?: boolean
  // prefijo del id del selector, para que no choquen si hay dos formularios
  idPrefix: string
}

const defaultValues: AssignRoutineFormValues = { selectedId: '' }

// formulario en línea para asignar una rutina a un atleta: un selector y Cancelar / Asignar.
// Lo usan la ficha del atleta (elige la rutina) y el detalle de la rutina (elige el atleta)
export function AssignRoutineForm({
  label,
  placeholder,
  requiredMessage,
  options,
  isLoadingOptions = false,
  optionsError,
  onRetryOptions,
  emptyMessage,
  hint,
  onSubmit,
  onCancel,
  isPending = false,
  idPrefix,
}: AssignRoutineFormProps) {
  const fieldId = `${idPrefix}-selectedId`

  const form = useForm({
    defaultValues,
    onSubmit: ({ value }) => onSubmit(value.selectedId),
  })

  const handleSubmit: SubmitEventHandler<HTMLFormElement> = (event) => {
    event.preventDefault()
    void form.handleSubmit()
  }

  const cancelButton = (
    <GhostButton size="sm" onClick={onCancel}>
      Cancelar
    </GhostButton>
  )

  if (optionsError) {
    return (
      <div className="flex flex-col items-start gap-3">
        <Callout tone="danger" className="self-stretch">
          {optionsError}
        </Callout>
        <div className="flex gap-3">
          {cancelButton}
          <OutlineButton size="sm" onClick={onRetryOptions}>
            <RotateCw aria-hidden="true" /> Reintentar
          </OutlineButton>
        </div>
      </div>
    )
  }

  if (isLoadingOptions) {
    return (
      <div className="flex flex-col items-start gap-3">
        <div
          role="status"
          aria-label={`Cargando opciones de ${label.toLowerCase()}`}
          className="flex flex-col gap-2 self-stretch"
        >
          <Skeleton className="h-4 w-20 motion-reduce:animate-none" />
          <Skeleton className="h-11 motion-reduce:animate-none" />
        </div>
        {cancelButton}
      </div>
    )
  }

  if (options.length === 0) {
    return (
      <div className="flex flex-col items-start gap-3">
        <p className="text-muted-foreground text-sm">{emptyMessage}</p>
        {cancelButton}
      </div>
    )
  }

  return (
    <form noValidate className="flex flex-col gap-4" onSubmit={handleSubmit}>
      <form.Field
        name="selectedId"
        validators={{ onChange: validateSelection(requiredMessage) }}
      >
        {(field) => {
          const error = field.state.meta.errors[0] as string | undefined
          const describedBy = error
            ? getFieldErrorId(fieldId)
            : hint
              ? getFieldHintId(fieldId)
              : undefined
          return (
            <FormField
              label={label}
              htmlFor={fieldId}
              error={error}
              hint={hint}
              required
            >
              <Select
                id={fieldId}
                name="selectedId"
                value={field.state.value}
                onChange={(event) => field.handleChange(event.target.value)}
                onBlur={field.handleBlur}
                aria-invalid={Boolean(error)}
                aria-describedby={describedBy}
              >
                <option value="">{placeholder}</option>
                {options.map(({ value, label: optionLabel, disabled }) => (
                  <option key={value} value={value} disabled={disabled}>
                    {optionLabel}
                  </option>
                ))}
              </Select>
            </FormField>
          )
        }}
      </form.Field>

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        {cancelButton}
        <form.Subscribe selector={(state) => state.isSubmitting}>
          {(isSubmitting) => (
            <PrimaryButton
              type="submit"
              size="sm"
              disabled={isSubmitting || isPending}
            >
              {isSubmitting || isPending ? 'Asignando...' : 'Asignar'}
            </PrimaryButton>
          )}
        </form.Subscribe>
      </div>
    </form>
  )
}
