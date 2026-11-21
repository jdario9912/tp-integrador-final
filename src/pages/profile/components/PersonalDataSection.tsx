import { useForm } from '@tanstack/react-form'
import { useState, type SubmitEventHandler } from 'react'
import { isApiError } from '../../../lib/api'
import { useUpdateOwnProfile, type OwnProfile } from '../../../lib/profile'
import { validateEmail, validateRequired } from '../../../lib/validation'
import { PrimaryButton } from '../../../ui/button'
import { Callout } from '../../../ui/callout'
import { SectionCard } from '../../../ui/card'
import { FormField, getFieldErrorId } from '../../../ui/form-field'
import { IdCard } from '../../../ui/icons'
import { TextInput } from '../../../ui/input'
import { EMAIL_TAKEN_MESSAGE, PROFILE_SAVED_MESSAGE } from '../messages'
import { distributeServerErrors } from '../server-errors'
import {
  toProfileFormValues,
  toUpdateProfileInput,
  type ProfileFormValues,
} from '../profile-form-values'

type FieldName = keyof ProfileFormValues

const FIELD_NAMES: readonly FieldName[] = [
  'firstName',
  'lastName',
  'email',
  'phone',
]

const fieldId = (name: FieldName) => `profile-${name}`

type FieldConfig = {
  name: FieldName
  label: string
  type?: string
  autoComplete?: string
  wide?: boolean
  // obligatorio: se marca con asterisco (el teléfono es opcional aunque tenga validación)
  required?: boolean
  validate?: (field: { value: string }) => string | undefined
}

type FieldValidator = (field: { value: string }) => string | undefined

// tope de caracteres del backend (contrato de US-48, 18.4): se avisa antes de enviar
const maxLength =
  (max: number, message: string): FieldValidator =>
  ({ value }) =>
    value.length > max ? message : undefined

// primer mensaje de error de una lista de validaciones, en orden
const firstError =
  (...validators: FieldValidator[]): FieldValidator =>
  (field) =>
    validators.map((validate) => validate(field)).find(Boolean)

const fields: FieldConfig[] = [
  {
    name: 'firstName',
    label: 'Nombre',
    autoComplete: 'given-name',
    required: true,
    validate: firstError(
      validateRequired('El nombre es obligatorio'),
      maxLength(100, 'El nombre no puede superar los 100 caracteres'),
    ),
  },
  {
    name: 'lastName',
    label: 'Apellido',
    autoComplete: 'family-name',
    required: true,
    validate: firstError(
      validateRequired('El apellido es obligatorio'),
      maxLength(100, 'El apellido no puede superar los 100 caracteres'),
    ),
  },
  {
    name: 'email',
    label: 'Email',
    type: 'email',
    autoComplete: 'email',
    wide: true,
    required: true,
    validate: firstError(
      validateEmail,
      maxLength(255, 'El email no puede superar los 255 caracteres'),
    ),
  },
  {
    name: 'phone',
    label: 'Teléfono',
    type: 'tel',
    autoComplete: 'tel',
    wide: true,
    validate: maxLength(30, 'El teléfono no puede superar los 30 caracteres'),
  },
]

type PersonalDataSectionProps = {
  profile: OwnProfile
}

// US-48: datos comunes de la cuenta. Un 409 en el email va a ese campo; un 400 a su campo
export function PersonalDataSection({ profile }: PersonalDataSectionProps) {
  const update = useUpdateOwnProfile()
  const [formError, setFormError] = useState<string>()
  const [saved, setSaved] = useState(false)

  const form = useForm({
    defaultValues: toProfileFormValues(profile),
    onSubmit: async ({ value, formApi }) => {
      setFormError(undefined)
      setSaved(false)
      const setFieldError = (name: FieldName, message: string) =>
        formApi.setFieldMeta(name, (meta) => ({
          ...meta,
          errorMap: { ...meta.errorMap, onServer: message },
        }))
      try {
        const updated = await update.mutateAsync(toUpdateProfileInput(value))
        // el formulario queda con lo que devolvió el servidor (espacios quitados, email normalizado)
        formApi.reset(toProfileFormValues(updated))
        setSaved(true)
      } catch (error) {
        if (isApiError(error) && error.status === 409) {
          setFieldError('email', EMAIL_TAKEN_MESSAGE)
          return
        }
        setFormError(distributeServerErrors(error, FIELD_NAMES, setFieldError))
      }
    },
  })

  const handleSubmit: SubmitEventHandler<HTMLFormElement> = (event) => {
    event.preventDefault()
    void form.handleSubmit()
  }

  return (
    <SectionCard title="Datos personales" icon={<IdCard />}>
      <form
        noValidate
        aria-label="Datos personales"
        className="grid grid-cols-1 gap-5 sm:grid-cols-2"
        onSubmit={handleSubmit}
      >
        {fields.map(
          ({ name, label, type, autoComplete, wide, required, validate }) => (
            <form.Field
              key={name}
              name={name}
              validators={validate && { onBlur: validate }}
            >
              {(field) => {
                const error = field.state.meta.errors[0] as string | undefined
                return (
                  <FormField
                    label={label}
                    htmlFor={fieldId(name)}
                    error={error}
                    required={Boolean(required)}
                    className={wide ? 'sm:col-span-2' : undefined}
                  >
                    <TextInput
                      id={fieldId(name)}
                      name={name}
                      type={type}
                      autoComplete={autoComplete}
                      value={field.state.value}
                      onChange={(event) =>
                        field.handleChange(event.target.value)
                      }
                      onBlur={field.handleBlur}
                      aria-invalid={Boolean(error)}
                      aria-describedby={
                        error ? getFieldErrorId(fieldId(name)) : undefined
                      }
                    />
                  </FormField>
                )
              }}
            </form.Field>
          ),
        )}

        {formError && (
          <Callout tone="danger" className="sm:col-span-2">
            {formError}
          </Callout>
        )}

        <div className="flex flex-wrap items-center gap-4 sm:col-span-2">
          <PrimaryButton type="submit" disabled={update.isPending}>
            {update.isPending ? 'Guardando...' : 'Guardar datos'}
          </PrimaryButton>
          {saved && (
            <p role="status" className="text-success text-sm font-semibold">
              {PROFILE_SAVED_MESSAGE}
            </p>
          )}
        </div>
      </form>
    </SectionCard>
  )
}
