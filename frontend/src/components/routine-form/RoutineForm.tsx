import { useForm } from '@tanstack/react-form'
import { useState, type SubmitEventHandler } from 'react'
import { isApiError } from '../../lib/api'
import { GhostButton, PrimaryButton } from '../../ui/button'
import { Callout } from '../../ui/callout'
import { SectionCard } from '../../ui/card'
import { Checkbox } from '../../ui/checkbox'
import { FormField, getFieldErrorId, getFieldHintId } from '../../ui/form-field'
import { ClipboardList } from '../../ui/icons'
import { NumberInput, TextInput } from '../../ui/input'
import { TextArea } from '../../ui/textarea'
import { emptyRoutineFormValues } from './mappers'
import type { RoutineFieldName, RoutineFormValues } from './types'
import {
  DAYS_PER_WEEK_MAX,
  DESCRIPTION_MAX_LENGTH,
  DURATION_WEEKS_MAX,
  GOAL_MAX_LENGTH,
  ROUTINE_NAME_MAX_LENGTH,
  validateDaysPerWeek,
  validateDescription,
  validateDurationWeeks,
  validateGoal,
  validateRoutineName,
} from './validation'

type RoutineFormProps = {
  defaultValues?: RoutineFormValues
  // si rechaza con un ApiError, sus errores se muestran en el formulario
  onSubmit: (values: RoutineFormValues) => Promise<void>
  onCancel: () => void
  submitLabel: string
  // prefijo de los ids de los campos, para que no choquen si hay dos formularios
  idPrefix: string
}

const isRoutineFieldName = (field: string): field is RoutineFieldName =>
  Object.hasOwn(emptyRoutineFormValues, field)

const DESCRIPTION_HINT = `Opcional. Hasta ${DESCRIPTION_MAX_LENGTH} caracteres.`
const TEMPLATE_HINT =
  'Una plantilla sirve de base para armar rutinas de distintos atletas.'

// datos generales de la rutina (alta y edición); los días y ejercicios se cargan aparte
export function RoutineForm({
  defaultValues = emptyRoutineFormValues,
  onSubmit,
  onCancel,
  submitLabel,
  idPrefix,
}: RoutineFormProps) {
  const [formError, setFormError] = useState<string>()

  const fieldId = (name: RoutineFieldName) => `${idPrefix}-${name}`

  // el error tiene prioridad sobre el hint, igual que en FormField
  const describedBy = (
    name: RoutineFieldName,
    error?: string,
    hint?: string,
  ) => {
    if (error) return getFieldErrorId(fieldId(name))
    if (hint) return getFieldHintId(fieldId(name))
    return undefined
  }

  const form = useForm({
    defaultValues,
    onSubmit: async ({ value, formApi }) => {
      setFormError(undefined)
      try {
        await onSubmit(value)
      } catch (error) {
        if (!isApiError(error)) {
          setFormError('Ocurrió un error inesperado. Intentá nuevamente.')
          return
        }

        // onServer se limpia solo cuando el usuario vuelve a editar el campo
        const setServerError = (field: RoutineFieldName, message: string) =>
          formApi.setFieldMeta(field, (meta) => ({
            ...meta,
            errorMap: { ...meta.errorMap, onServer: message },
          }))

        // 409: ya hay una rutina propia con ese nombre (sin distinguir mayúsculas); llega sin
        // errores por campo, pero es un problema del nombre
        if (error.status === 409 && error.fieldErrors.length === 0) {
          setServerError('name', error.message)
          return
        }

        const unmappedErrors = error.fieldErrors.filter(
          ({ field }) => !isRoutineFieldName(field),
        )
        error.fieldErrors.forEach(({ field, message }) => {
          if (isRoutineFieldName(field)) setServerError(field, message)
        })

        // 403 llega sin errores por campo
        if (error.fieldErrors.length === 0 || unmappedErrors.length > 0) {
          setFormError(error.message)
        }
      }
    },
  })

  const handleSubmit: SubmitEventHandler<HTMLFormElement> = (event) => {
    event.preventDefault()
    void form.handleSubmit()
  }

  return (
    <form noValidate className="flex flex-col gap-6" onSubmit={handleSubmit}>
      <SectionCard title="Datos de la rutina" icon={<ClipboardList />}>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <form.Field name="name" validators={{ onBlur: validateRoutineName }}>
            {(field) => {
              const error = field.state.meta.errors[0] as string | undefined
              return (
                <FormField
                  label="Nombre"
                  htmlFor={fieldId('name')}
                  error={error}
                  required
                >
                  <TextInput
                    id={fieldId('name')}
                    name="name"
                    autoComplete="off"
                    placeholder="ej. Fase de volumen"
                    maxLength={ROUTINE_NAME_MAX_LENGTH}
                    value={field.state.value}
                    onChange={(event) => field.handleChange(event.target.value)}
                    onBlur={field.handleBlur}
                    aria-invalid={Boolean(error)}
                    aria-describedby={describedBy('name', error)}
                  />
                </FormField>
              )
            }}
          </form.Field>

          <form.Field name="goal" validators={{ onBlur: validateGoal }}>
            {(field) => {
              const error = field.state.meta.errors[0] as string | undefined
              return (
                <FormField
                  label="Objetivo"
                  htmlFor={fieldId('goal')}
                  error={error}
                >
                  <TextInput
                    id={fieldId('goal')}
                    name="goal"
                    autoComplete="off"
                    placeholder="ej. Hipertrofia"
                    maxLength={GOAL_MAX_LENGTH}
                    value={field.state.value}
                    onChange={(event) => field.handleChange(event.target.value)}
                    onBlur={field.handleBlur}
                    aria-invalid={Boolean(error)}
                    aria-describedby={describedBy('goal', error)}
                  />
                </FormField>
              )
            }}
          </form.Field>

          <form.Field
            name="daysPerWeek"
            validators={{ onBlur: validateDaysPerWeek }}
          >
            {(field) => {
              const error = field.state.meta.errors[0] as string | undefined
              return (
                <FormField
                  label="Días por semana"
                  htmlFor={fieldId('daysPerWeek')}
                  error={error}
                >
                  <NumberInput
                    id={fieldId('daysPerWeek')}
                    name="daysPerWeek"
                    inputMode="numeric"
                    min={1}
                    max={DAYS_PER_WEEK_MAX}
                    step={1}
                    suffix="días"
                    placeholder="0"
                    value={field.state.value}
                    onChange={(event) => field.handleChange(event.target.value)}
                    onBlur={field.handleBlur}
                    aria-invalid={Boolean(error)}
                    aria-describedby={describedBy('daysPerWeek', error)}
                  />
                </FormField>
              )
            }}
          </form.Field>

          <form.Field
            name="durationWeeks"
            validators={{ onBlur: validateDurationWeeks }}
          >
            {(field) => {
              const error = field.state.meta.errors[0] as string | undefined
              return (
                <FormField
                  label="Duración"
                  htmlFor={fieldId('durationWeeks')}
                  error={error}
                >
                  <NumberInput
                    id={fieldId('durationWeeks')}
                    name="durationWeeks"
                    inputMode="numeric"
                    min={1}
                    max={DURATION_WEEKS_MAX}
                    step={1}
                    suffix="semanas"
                    placeholder="0"
                    value={field.state.value}
                    onChange={(event) => field.handleChange(event.target.value)}
                    onBlur={field.handleBlur}
                    aria-invalid={Boolean(error)}
                    aria-describedby={describedBy('durationWeeks', error)}
                  />
                </FormField>
              )
            }}
          </form.Field>

          <form.Field
            name="description"
            validators={{ onBlur: validateDescription }}
          >
            {(field) => {
              const error = field.state.meta.errors[0] as string | undefined
              return (
                <FormField
                  label="Descripción"
                  htmlFor={fieldId('description')}
                  error={error}
                  hint={DESCRIPTION_HINT}
                  className="sm:col-span-2"
                >
                  <TextArea
                    id={fieldId('description')}
                    name="description"
                    rows={4}
                    placeholder="Enfoque, progresión, indicaciones generales..."
                    maxLength={DESCRIPTION_MAX_LENGTH}
                    value={field.state.value}
                    onChange={(event) => field.handleChange(event.target.value)}
                    onBlur={field.handleBlur}
                    aria-invalid={Boolean(error)}
                    aria-describedby={describedBy(
                      'description',
                      error,
                      DESCRIPTION_HINT,
                    )}
                  />
                </FormField>
              )
            }}
          </form.Field>

          <form.Field name="isTemplate">
            {(field) => (
              <div className="flex flex-col gap-1.5 sm:col-span-2">
                <Checkbox
                  id={fieldId('isTemplate')}
                  name="isTemplate"
                  checked={field.state.value}
                  onChange={(event) => field.handleChange(event.target.checked)}
                  onBlur={field.handleBlur}
                  aria-describedby={getFieldHintId(fieldId('isTemplate'))}
                >
                  Guardar como plantilla
                </Checkbox>
                <p
                  id={getFieldHintId(fieldId('isTemplate'))}
                  className="text-muted-foreground text-sm"
                >
                  {TEMPLATE_HINT}
                </p>
              </div>
            )}
          </form.Field>
        </div>
      </SectionCard>

      {formError && <Callout tone="danger">{formError}</Callout>}

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <GhostButton size="lg" onClick={onCancel}>
          Cancelar
        </GhostButton>
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
