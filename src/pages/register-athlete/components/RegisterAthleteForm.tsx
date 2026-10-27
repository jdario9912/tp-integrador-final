import { useForm } from '@tanstack/react-form'
import { CalendarDays, Scale, User } from 'lucide-react'
import { useState, type ReactNode, type SubmitEventHandler } from 'react'
import { useNavigate } from 'react-router-dom'
import { isApiError } from '../../../lib/api'
import {
  validateEmail,
  validatePassword,
  validateRequired,
} from '../../../lib/validation'
import { paths } from '../../../router/paths'
import { GhostButton, PrimaryButton } from '../../../ui/button'
import { Callout } from '../../../ui/callout'
import { SectionCard } from '../../../ui/card'
import {
  FormField,
  getFieldErrorId,
  getFieldHintId,
} from '../../../ui/form-field'
import { DateInput, NumberInput, TextInput } from '../../../ui/input'
import { SegmentedControl } from '../../../ui/segmented-control'
import { Select } from '../../../ui/select'
import { TextArea } from '../../../ui/textarea'
import { useCreateAthlete } from '../hooks/use-create-athlete'
import { toCreateAthleteInput } from '../to-create-athlete-input'
import type { ExperienceLevel, RegisterAthleteFormValues, Sex } from '../types'
import {
  todayIsoDate,
  validateAvailableDays,
  validateMeasure,
  validatePastDate,
} from '../validation'

type FieldName = keyof RegisterAthleteFormValues

type TextFieldName = Exclude<FieldName, 'sex' | 'experienceLevel'>

const defaultValues: RegisterAthleteFormValues = {
  firstName: '',
  lastName: '',
  email: '',
  password: '',
  phone: '',
  sex: '',
  experienceLevel: '',
  birthDate: '',
  heightCm: '',
  initialWeightKg: '',
  goal: '',
  injuries: '',
  limitations: '',
  availableDays: '',
  startDate: '',
}

const isFieldName = (field: string): field is FieldName =>
  Object.hasOwn(defaultValues, field)

// el resto de los datos son opcionales: algunos tienen validador pero aceptan quedar vacíos
const requiredFields: ReadonlySet<FieldName> = new Set([
  'firstName',
  'lastName',
  'email',
  'password',
])

const fieldId = (name: FieldName) => `register-athlete-${name}`

// el error tiene prioridad sobre el hint, igual que en FormField
const describedBy = (name: FieldName, error?: string, hint?: string) => {
  if (error) return getFieldErrorId(fieldId(name))
  if (hint) return getFieldHintId(fieldId(name))
  return undefined
}

type TextFieldConfig = {
  name: TextFieldName
  label: string
  control?: 'input' | 'date' | 'number' | 'textarea'
  type?: string
  autoComplete?: string
  placeholder?: string
  hint?: string
  suffix?: string
  max?: string
  // ocupa las dos columnas en pantallas anchas
  wide?: boolean
  validate?: (field: { value: string }) => string | undefined
}

const personalFields: TextFieldConfig[] = [
  {
    name: 'firstName',
    label: 'Nombre',
    autoComplete: 'off',
    placeholder: 'ej. Juana',
    validate: validateRequired('El nombre es obligatorio'),
  },
  {
    name: 'lastName',
    label: 'Apellido',
    autoComplete: 'off',
    placeholder: 'ej. Pérez',
    validate: validateRequired('El apellido es obligatorio'),
  },
  {
    name: 'email',
    label: 'Email',
    type: 'email',
    autoComplete: 'off',
    placeholder: 'juana.perez@ejemplo.com',
    hint: 'Lo usa para ingresar a la aplicación.',
    wide: true,
    validate: validateEmail,
  },
  {
    name: 'password',
    label: 'Contraseña',
    type: 'password',
    autoComplete: 'new-password',
    hint: 'Contraseña inicial que le vas a compartir al atleta.',
    validate: validatePassword,
  },
  {
    name: 'phone',
    label: 'Teléfono',
    type: 'tel',
    autoComplete: 'off',
  },
]

const bodyFields: TextFieldConfig[] = [
  {
    name: 'heightCm',
    label: 'Altura',
    control: 'number',
    suffix: 'cm',
    placeholder: '0',
    validate: validateMeasure('La altura'),
  },
  {
    name: 'initialWeightKg',
    label: 'Peso inicial',
    control: 'number',
    suffix: 'kg',
    placeholder: '0.0',
    validate: validateMeasure('El peso inicial'),
  },
  {
    name: 'goal',
    label: 'Objetivo',
    placeholder: 'ej. Hipertrofia',
    wide: true,
  },
]

const trainingFields: TextFieldConfig[] = [
  { name: 'startDate', label: 'Fecha de inicio', control: 'date' },
  {
    name: 'availableDays',
    label: 'Días disponibles',
    control: 'number',
    suffix: 'días/semana',
    placeholder: '0',
    validate: validateAvailableDays,
  },
  {
    name: 'injuries',
    label: 'Lesiones',
    control: 'textarea',
    placeholder: 'Lesiones previas o actuales...',
    wide: true,
  },
  {
    name: 'limitations',
    label: 'Limitaciones',
    control: 'textarea',
    placeholder: 'Disponibilidad, equipamiento, preferencias...',
    wide: true,
  },
]

const sexOptions: { value: Sex | ''; label: string }[] = [
  { value: '', label: 'Sin especificar' },
  { value: 'MALE', label: 'Masculino' },
  { value: 'FEMALE', label: 'Femenino' },
  { value: 'OTHER', label: 'Otro' },
]

const experienceOptions: { value: ExperienceLevel; label: string }[] = [
  { value: 'BEGINNER', label: 'Principiante' },
  { value: 'INTERMEDIATE', label: 'Intermedio' },
  { value: 'ADVANCED', label: 'Avanzado' },
]

const fieldGridClasses = 'grid grid-cols-1 gap-5 sm:grid-cols-2'

// al crear el atleta vuelve al dashboard, que muestra el aviso con su nombre
export function RegisterAthleteForm() {
  const createAthlete = useCreateAthlete()
  const [formError, setFormError] = useState<string>()
  const navigate = useNavigate()

  const form = useForm({
    defaultValues,
    onSubmit: async ({ value, formApi }) => {
      setFormError(undefined)
      try {
        const athlete = await createAthlete.mutateAsync(
          toCreateAthleteInput(value),
        )
        navigate(paths.dashboard, {
          state: {
            createdAthlete: `${athlete.firstName} ${athlete.lastName}`,
          },
        })
      } catch (error) {
        if (!isApiError(error)) {
          setFormError('Ocurrió un error inesperado. Intentá nuevamente.')
          return
        }

        const unmappedErrors = error.fieldErrors.filter(
          ({ field }) => !isFieldName(field),
        )
        error.fieldErrors.forEach(({ field, message }) => {
          if (!isFieldName(field)) return
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
  }: TextFieldConfig): ReactNode => (
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
          {renderTextField({
            name: 'birthDate',
            label: 'Fecha de nacimiento',
            control: 'date',
            max: todayIsoDate(),
            validate: validatePastDate,
          })}
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
          {bodyFields.map(renderTextField)}
        </div>
      </SectionCard>

      <SectionCard title="Información de entrenamiento" icon={<CalendarDays />}>
        <div className={fieldGridClasses}>
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
          {trainingFields.map(renderTextField)}
        </div>
      </SectionCard>

      {formError && <Callout tone="danger">{formError}</Callout>}

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <GhostButton size="lg" onClick={() => navigate(paths.dashboard)}>
          Cancelar
        </GhostButton>
        <PrimaryButton
          type="submit"
          size="lg"
          disabled={createAthlete.isPending}
        >
          {createAthlete.isPending ? 'Guardando...' : 'Guardar atleta'}
        </PrimaryButton>
      </div>
    </form>
  )
}
