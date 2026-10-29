import { useForm } from '@tanstack/react-form'
import { CalendarDays, Scale, User } from 'lucide-react'
import { useState, type ReactNode, type SubmitEventHandler } from 'react'
import { isApiError } from '../../lib/api'
import type { ExperienceLevel, Sex } from '../../lib/athletes'
import { GhostButton, PrimaryButton } from '../../ui/button'
import { Callout } from '../../ui/callout'
import { SectionCard } from '../../ui/card'
import { FormField, getFieldErrorId, getFieldHintId } from '../../ui/form-field'
import { DateInput, NumberInput, TextInput } from '../../ui/input'
import { SegmentedControl } from '../../ui/segmented-control'
import { Select } from '../../ui/select'
import { TextArea } from '../../ui/textarea'
import {
  birthDateField,
  bodyFields,
  coachCreateFields,
  experienceOptions,
  isAthleteFieldName,
  personalFields,
  requiredFields,
  sexOptions,
  trainingFields,
  type TextFieldConfig,
} from './fields'
import type { AthleteFieldName, AthleteFormValues } from './types'
import { todayIsoDate } from './validation'

type AthleteFormProps = {
  defaultValues: AthleteFormValues
  // campos que se muestran: los ocultos no se validan y conservan su valor por defecto
  fields?: ReadonlySet<AthleteFieldName>
  // si rechaza con un ApiError, sus errores se muestran en el formulario
  onSubmit: (values: AthleteFormValues) => Promise<void>
  onCancel: () => void
  submitLabel: string
  // prefijo de los ids de los campos, para que no choquen si hay dos formularios
  idPrefix: string
}

const fieldGridClasses = 'grid grid-cols-1 gap-5 sm:grid-cols-2'

// datos del atleta: lo comparten el alta y la edición del entrenador
export function AthleteForm({
  defaultValues,
  fields = coachCreateFields,
  onSubmit,
  onCancel,
  submitLabel,
  idPrefix,
}: AthleteFormProps) {
  const [formError, setFormError] = useState<string>()

  const fieldId = (name: AthleteFieldName) => `${idPrefix}-${name}`

  // el error tiene prioridad sobre el hint, igual que en FormField
  const describedBy = (
    name: AthleteFieldName,
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

        // un error de un campo oculto no tiene dónde mostrarse: va al aviso general
        const isShownField = (field: string): field is AthleteFieldName =>
          isAthleteFieldName(field) && fields.has(field)
        const unmappedErrors = error.fieldErrors.filter(
          ({ field }) => !isShownField(field),
        )
        error.fieldErrors.forEach(({ field, message }) => {
          if (!isShownField(field)) return
          // onServer se limpia solo cuando el usuario vuelve a editar el campo
          formApi.setFieldMeta(field, (meta) => ({
            ...meta,
            errorMap: { ...meta.errorMap, onServer: message },
          }))
        })

        // 409 (email en uso) y 403 llegan sin errores por campo
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

  const renderTextField = ({
    name,
    label,
    control = 'input',
    type,
    autoComplete,
    placeholder,
    hint,
    suffix,
    max,
    wide,
    validate,
  }: TextFieldConfig): ReactNode =>
    fields.has(name) && (
      <form.Field
        key={name}
        name={name}
        validators={validate && { onBlur: validate }}
      >
        {(field) => {
          const error = field.state.meta.errors[0] as string | undefined
          const controlProps = {
            id: fieldId(name),
            name,
            placeholder,
            value: field.state.value,
            onBlur: field.handleBlur,
            'aria-invalid': Boolean(error),
            'aria-describedby': describedBy(name, error, hint),
          }
          const onChange = (event: { target: { value: string } }) =>
            field.handleChange(event.target.value)

          return (
            <FormField
              label={label}
              htmlFor={fieldId(name)}
              error={error}
              hint={hint}
              required={requiredFields.has(name)}
              className={wide ? 'sm:col-span-2' : undefined}
            >
              {control === 'textarea' && (
                <TextArea rows={3} onChange={onChange} {...controlProps} />
              )}
              {control === 'date' && (
                <DateInput max={max} onChange={onChange} {...controlProps} />
              )}
              {control === 'number' && (
                <NumberInput
                  min={0}
                  step="any"
                  suffix={suffix}
                  onChange={onChange}
                  {...controlProps}
                />
              )}
              {control === 'input' && (
                <TextInput
                  type={type}
                  autoComplete={autoComplete}
                  onChange={onChange}
                  {...controlProps}
                />
              )}
            </FormField>
          )
        }}
      </form.Field>
    )

  return (
    <form noValidate className="flex flex-col gap-6" onSubmit={handleSubmit}>
      <SectionCard title="Información personal" icon={<User />}>
        <div className={fieldGridClasses}>
          {personalFields.map(renderTextField)}
        </div>
      </SectionCard>

      <SectionCard title="Datos corporales y objetivos" icon={<Scale />}>
        <div className={fieldGridClasses}>
          {renderTextField(birthDateField(todayIsoDate()))}
          {fields.has('sex') && (
            <form.Field name="sex">
              {(field) => (
                <FormField label="Sexo" htmlFor={fieldId('sex')}>
                  <Select
                    id={fieldId('sex')}
                    name="sex"
                    value={field.state.value}
                    onChange={(event) =>
                      field.handleChange(event.target.value as Sex | '')
                    }
                    onBlur={field.handleBlur}
                  >
                    {sexOptions.map(({ value, label }) => (
                      <option key={label} value={value}>
                        {label}
                      </option>
                    ))}
                  </Select>
                </FormField>
              )}
            </form.Field>
          )}
          {bodyFields.map(renderTextField)}
        </div>
      </SectionCard>

      <SectionCard title="Información de entrenamiento" icon={<CalendarDays />}>
        <div className={fieldGridClasses}>
          {fields.has('experienceLevel') && (
            <form.Field name="experienceLevel">
              {(field) => (
                <div className="flex flex-col gap-1.5 sm:col-span-2">
                  {/* el nombre accesible lo da la legend del fieldset */}
                  <span aria-hidden="true" className="text-sm font-semibold">
                    Nivel de experiencia
                  </span>
                  <SegmentedControl<ExperienceLevel | ''>
                    legend="Nivel de experiencia"
                    name="experienceLevel"
                    variant="chips"
                    options={experienceOptions}
                    value={field.state.value}
                    onValueChange={field.handleChange}
                  />
                </div>
              )}
            </form.Field>
          )}
          {trainingFields.map(renderTextField)}
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
