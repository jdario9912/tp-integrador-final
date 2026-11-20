import { useForm } from '@tanstack/react-form'
import {
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type SubmitEventHandler,
} from 'react'
import { isApiError } from '../../../lib/api'
import type { BodyMeasurementRecordInput } from '../../../lib/body-measurements'
import { GhostButton, PrimaryButton } from '../../../ui/button'
import { Callout } from '../../../ui/callout'
import {
  FormField,
  getFieldErrorId,
  getFieldHintId,
} from '../../../ui/form-field'
import { DateInput, NumberInput } from '../../../ui/input'
import { TextArea } from '../../../ui/textarea'
import {
  fieldKeyOfServerError,
  toBodyMeasurementInput,
} from '../body-measurement-form-values'
import type { MeasurementField } from '../body-measurement-fields'
import {
  hasAnyMeasurement,
  validateBodyMeasurementComment,
  validateBodyMeasurementDate,
  validateMeasurementValue,
} from '../body-measurement-validation'
import { COMMENT_MAX_LENGTH } from '../validation'
import type { BodyMeasurementFormValues } from '../types'

type BodyMeasurementFormProps = {
  defaultValues: BodyMeasurementFormValues
  // las medidas a cargar, según el catálogo de la API
  fields: MeasurementField[]
  // último día que se puede elegir: hoy en la zona de la app
  maxDate: string
  // recibe el body ya armado; si rechaza con un ApiError, sus errores se muestran en el formulario
  onSubmit: (input: BodyMeasurementRecordInput) => Promise<void>
  submitLabel: string
  // solo en la edición: vuelve al alta sin guardar
  onCancel?: () => void
  idPrefix: string
  // avisos sobre los botones (por ejemplo, el día ya registrado)
  children?: ReactNode
}

const COMMENT_HINT = `Opcional. Hasta ${COMMENT_MAX_LENGTH} caracteres.`
const EMPTY_HINT_MESSAGE = 'Cargá al menos una medida para guardar el registro.'

// US-45: fecha, medidas (una por campo del catálogo) y comentario de un registro de medidas.
// Lo comparten el alta y la edición. En la edición, un campo vacío quita esa medida del registro
export function BodyMeasurementForm({
  defaultValues,
  fields,
  maxDate,
  onSubmit,
  submitLabel,
  onCancel,
  idPrefix,
  children,
}: BodyMeasurementFormProps) {
  const [formError, setFormError] = useState<string>()
  const formErrorRef = useRef<HTMLDivElement>(null)

  const fieldId = (name: string) => `${idPrefix}-${name}`
  const focusField = (name: string) =>
    document.getElementById(fieldId(name))?.focus()

  // orden en pantalla: si la validación falla se enfoca el primer campo con error
  const order = ['date', ...fields.map((field) => field.key), 'comment']

  // el error tiene prioridad sobre el hint, igual que en FormField
  const describedBy = (name: string, error?: string, hint?: string) => {
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
      const invalid = order.find((name) => {
        const meta = formApi.getFieldMeta(pathOf(name))
        return (meta?.errors.length ?? 0) > 0
      })
      if (invalid) focusField(invalid)
    },
    onSubmit: async ({ value, formApi }) => {
      setFormError(undefined)
      if (!hasAnyMeasurement(value.measurements)) {
        setFormError(EMPTY_HINT_MESSAGE)
        return
      }
      const { input, fieldKeys } = toBodyMeasurementInput(value, fields)
      try {
        await onSubmit(input)
      } catch (error) {
        if (!isApiError(error)) {
          setFormError('Ocurrió un error inesperado. Intentá nuevamente.')
          return
        }

        // el servidor nombra "values[1].value": se lleva al campo de esa medida
        const mapped = error.fieldErrors.flatMap(({ field, message }) => {
          const name =
            field === 'date' || field === 'comment'
              ? field
              : fieldKeyOfServerError(field, fieldKeys)
          return name ? [{ name, message }] : []
        })
        mapped.forEach(({ name, message }) => {
          // onServer se limpia solo cuando el usuario vuelve a editar el campo
          formApi.setFieldMeta(pathOf(name), (meta) => ({
            ...meta,
            errorMap: { ...meta.errorMap, onServer: message },
          }))
        })

        // 403, 404, un error general de "values" o uno de un campo que no está: aviso general
        if (mapped.length === 0 || mapped.length < error.fieldErrors.length) {
          setFormError(error.message)
        }
        const first = order.find((name) =>
          mapped.some((item) => item.name === name),
        )
        if (first && mapped.length === error.fieldErrors.length) {
          focusField(first)
        }
      }
    },
  })

  const handleSubmit: SubmitEventHandler<HTMLFormElement> = (event) => {
    event.preventDefault()
    void form.handleSubmit()
  }

  return (
    <form noValidate className="flex flex-col gap-5" onSubmit={handleSubmit}>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <form.Field
          name="date"
          validators={{ onBlur: validateBodyMeasurementDate }}
        >
          {(field) => {
            const error = field.state.meta.errors[0] as string | undefined
            return (
              <FormField
                label="Día de las medidas"
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

        {fields.map((measurement) => (
          <form.Field
            key={measurement.key}
            name={pathOf(measurement.key)}
            validators={{
              onBlur: ({ value }) =>
                validateMeasurementValue(value, measurement),
            }}
          >
            {(field) => {
              const error = field.state.meta.errors[0] as string | undefined
              const hint = `Entre ${measurement.min} y ${measurement.max} ${measurement.unit}, hasta 2 decimales.`
              return (
                <FormField
                  label={measurement.label}
                  htmlFor={fieldId(measurement.key)}
                  error={error}
                  hint={hint}
                >
                  <NumberInput
                    id={fieldId(measurement.key)}
                    name={measurement.key}
                    min={measurement.min}
                    max={measurement.max}
                    step="any"
                    suffix={measurement.unit}
                    autoComplete="off"
                    placeholder={`ej. ${measurement.min + 1}`}
                    value={field.state.value}
                    onChange={(event) => field.handleChange(event.target.value)}
                    onBlur={field.handleBlur}
                    aria-invalid={Boolean(error)}
                    aria-describedby={describedBy(measurement.key, error, hint)}
                  />
                </FormField>
              )
            }}
          </form.Field>
        ))}

        <form.Field
          name="comment"
          validators={{ onBlur: validateBodyMeasurementComment }}
        >
          {(field) => {
            const error = field.state.meta.errors[0] as string | undefined
            return (
              <FormField
                label="Comentario de las medidas"
                htmlFor={fieldId('comment')}
                error={error}
                hint={COMMENT_HINT}
                className="sm:col-span-2"
              >
                <TextArea
                  id={fieldId('comment')}
                  name="comment"
                  rows={3}
                  placeholder="ej. Medidas en ayunas, antes de entrenar..."
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

// ruta de TanStack Form de un campo: las medidas viven bajo "measurements"
type FieldPath = 'date' | 'comment' | `measurements.${string}`

const pathOf = (name: string): FieldPath =>
  name === 'date' || name === 'comment' ? name : `measurements.${name}`
