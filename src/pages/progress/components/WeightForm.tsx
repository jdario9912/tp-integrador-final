import { useForm } from '@tanstack/react-form'
import {
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type SubmitEventHandler,
} from 'react'
import { isApiError } from '../../../lib/api'
import { GhostButton, PrimaryButton } from '../../../ui/button'
import { Callout } from '../../../ui/callout'
import {
  FormField,
  getFieldErrorId,
  getFieldHintId,
} from '../../../ui/form-field'
import { DateInput, NumberInput } from '../../../ui/input'
import { TextArea } from '../../../ui/textarea'
import type { WeightFieldName, WeightFormValues } from '../types'
import {
  COMMENT_MAX_LENGTH,
  WEIGHT_MAX_KG,
  WEIGHT_MIN_KG,
  validateWeightComment,
  validateWeightDate,
  validateWeightKg,
} from '../validation'

type WeightFormProps = {
  defaultValues: WeightFormValues
  // último día que se puede elegir: hoy en la zona de la app
  maxDate: string
  // si rechaza con un ApiError, sus errores se muestran en el formulario
  onSubmit: (values: WeightFormValues) => Promise<void>
  submitLabel: string
  // solo en la edición: vuelve al alta sin guardar
  onCancel?: () => void
  // prefijo de los ids de los campos
  idPrefix: string
  // avisos sobre los botones (por ejemplo, el día ya registrado)
  children?: ReactNode
}

// orden en pantalla: si la validación falla se enfoca el primer campo con error
const FIELD_ORDER: readonly WeightFieldName[] = ['date', 'weightKg', 'comment']

const isWeightFieldName = (field: string): field is WeightFieldName =>
  FIELD_ORDER.some((name) => name === field)

const WEIGHT_HINT = `Entre ${WEIGHT_MIN_KG} y ${WEIGHT_MAX_KG} kg, hasta 2 decimales.`
const COMMENT_HINT = `Opcional. Hasta ${COMMENT_MAX_LENGTH} caracteres.`

// fecha, peso y comentario de un registro: lo comparten el alta y la edición
export function WeightForm({
  defaultValues,
  maxDate,
  onSubmit,
  submitLabel,
  onCancel,
  idPrefix,
  children,
}: WeightFormProps) {
  const [formError, setFormError] = useState<string>()
  const formErrorRef = useRef<HTMLDivElement>(null)

  const fieldId = (name: WeightFieldName) => `${idPrefix}-${name}`
  const focusField = (name: WeightFieldName) =>
    document.getElementById(fieldId(name))?.focus()

  // el error tiene prioridad sobre el hint, igual que en FormField
  const describedBy = (
    name: WeightFieldName,
    error?: string,
    hint?: string,
  ) => {
    if (error) return getFieldErrorId(fieldId(name))
    if (hint) return getFieldHintId(fieldId(name))
    return undefined
  }

  // el botón se deshabilita mientras se envía y el foco se pierde: se lleva al error
  useEffect(() => {
    if (formError) formErrorRef.current?.focus()
  }, [formError])

  const form = useForm({
    defaultValues,
    onSubmitInvalid: ({ formApi }) => {
      const invalid = FIELD_ORDER.find(
        (name) => formApi.getFieldMeta(name)?.errors.length,
      )
      if (invalid) focusField(invalid)
    },
    onSubmit: async ({ value, formApi }) => {
      setFormError(undefined)
      try {
        await onSubmit(value)
      } catch (error) {
        if (!isApiError(error)) {
          setFormError('Ocurrió un error inesperado. Intentá nuevamente.')
          return
        }

        const fieldErrors = error.fieldErrors.filter(({ field }) =>
          isWeightFieldName(field),
        )
        fieldErrors.forEach(({ field, message }) => {
          // onServer se limpia solo cuando el usuario vuelve a editar el campo
          formApi.setFieldMeta(field as WeightFieldName, (meta) => ({
            ...meta,
            errorMap: { ...meta.errorMap, onServer: message },
          }))
        })

        // 403, 404 o un error de un campo que no está en el formulario: aviso general
        if (
          fieldErrors.length === 0 ||
          fieldErrors.length < error.fieldErrors.length
        ) {
          setFormError(error.message)
          return
        }
        const firstInvalid = FIELD_ORDER.find((name) =>
          fieldErrors.some(({ field }) => field === name),
        )
        if (firstInvalid) focusField(firstInvalid)
      }
    },
  })

  const handleSubmit: SubmitEventHandler<HTMLFormElement> = (event) => {
    event.preventDefault()
    void form.handleSubmit()
  }

  return (
    <form noValidate className="flex flex-col gap-5" onSubmit={handleSubmit}>
      {/* una columna en la tarjeta angosta de escritorio; dos en tablet */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-1">
        <form.Field name="date" validators={{ onBlur: validateWeightDate }}>
          {(field) => {
            const error = field.state.meta.errors[0] as string | undefined
            return (
              <FormField
                label="Fecha"
                htmlFor={fieldId('date')}
                error={error}
                required
              >
                <DateInput
                  id={fieldId('date')}
                  name="date"
                  max={maxDate}
                  aria-required="true"
                  value={field.state.value}
                  onChange={(event) => field.handleChange(event.target.value)}
                  onBlur={field.handleBlur}
                  aria-invalid={Boolean(error)}
                  aria-describedby={describedBy('date', error)}
                />
              </FormField>
            )
          }}
        </form.Field>

        <form.Field name="weightKg" validators={{ onBlur: validateWeightKg }}>
          {(field) => {
            const error = field.state.meta.errors[0] as string | undefined
            return (
              <FormField
                label="Peso"
                htmlFor={fieldId('weightKg')}
                error={error}
                hint={WEIGHT_HINT}
                required
              >
                <NumberInput
                  id={fieldId('weightKg')}
                  name="weightKg"
                  min={WEIGHT_MIN_KG}
                  max={WEIGHT_MAX_KG}
                  step="any"
                  suffix="kg"
                  autoComplete="off"
                  placeholder="ej. 72,5"
                  aria-required="true"
                  value={field.state.value}
                  onChange={(event) => field.handleChange(event.target.value)}
                  onBlur={field.handleBlur}
                  aria-invalid={Boolean(error)}
                  aria-describedby={describedBy('weightKg', error, WEIGHT_HINT)}
                />
              </FormField>
            )
          }}
        </form.Field>

        <form.Field
          name="comment"
          validators={{ onBlur: validateWeightComment }}
        >
          {(field) => {
            const error = field.state.meta.errors[0] as string | undefined
            return (
              <FormField
                label="Comentario"
                htmlFor={fieldId('comment')}
                error={error}
                hint={COMMENT_HINT}
                className="sm:col-span-2 xl:col-span-1"
              >
                <TextArea
                  id={fieldId('comment')}
                  name="comment"
                  rows={3}
                  placeholder="ej. En ayunas, después de entrenar..."
                  maxLength={COMMENT_MAX_LENGTH}
                  value={field.state.value}
                  onChange={(event) => field.handleChange(event.target.value)}
                  onBlur={field.handleBlur}
                  aria-invalid={Boolean(error)}
                  aria-describedby={describedBy('comment', error, COMMENT_HINT)}
                />
              </FormField>
            )
          }}
        </form.Field>
      </div>

      {children}

      {formError && (
        <div ref={formErrorRef} tabIndex={-1} className="focus:outline-none">
          <Callout tone="danger">{formError}</Callout>
        </div>
      )}

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        {onCancel && (
          <GhostButton size="lg" onClick={onCancel}>
            Cancelar
          </GhostButton>
        )}
        <form.Subscribe selector={(state) => state.isSubmitting}>
          {(isSubmitting) => (
            <PrimaryButton type="submit" size="lg" disabled={isSubmitting}>
              {isSubmitting ? 'Guardando...' : submitLabel}
            </PrimaryButton>
          )}
        </form.Subscribe>
      </div>
    </form>
  )
}
