import { useForm } from '@tanstack/react-form'
import { useState, type SubmitEventHandler } from 'react'
import { useNavigate } from 'react-router-dom'
import { isApiError } from '../../../lib/api'
import { validateEmail, validateRequired } from '../../../lib/validation'
import { paths } from '../../../router/paths'
import { PrimaryButton } from '../../../ui/button'
import { FormField, getFieldErrorId } from '../../../ui/form-field'
import { TextInput } from '../../../ui/input'
import { TextArea } from '../../../ui/textarea'
import { useLogin } from '../../login/hooks/use-login'
import { useCreateCoach } from '../hooks/use-create-coach'
import { toCreateCoachInput } from '../to-create-coach-input'
import type { RegisterCoachFormValues } from '../types'
import { validatePassword } from '../validation'

type FieldName = keyof RegisterCoachFormValues

const defaultValues: RegisterCoachFormValues = {
  firstName: '',
  lastName: '',
  email: '',
  password: '',
  phone: '',
  specialty: '',
  licenseNumber: '',
  bio: '',
}

const isFieldName = (field: string): field is FieldName =>
  Object.hasOwn(defaultValues, field)

const fieldId = (name: FieldName) => `register-coach-${name}`

const textFields: {
  name: Exclude<FieldName, 'bio'>
  label: string
  type?: string
  autoComplete?: string
  validate?: (field: { value: string }) => string | undefined
}[] = [
  {
    name: 'firstName',
    label: 'Nombre',
    autoComplete: 'given-name',
    validate: validateRequired('El nombre es obligatorio'),
  },
  {
    name: 'lastName',
    label: 'Apellido',
    autoComplete: 'family-name',
    validate: validateRequired('El apellido es obligatorio'),
  },
  {
    name: 'email',
    label: 'Email',
    type: 'email',
    autoComplete: 'email',
    validate: validateEmail,
  },
  {
    name: 'password',
    label: 'Contraseña',
    type: 'password',
    autoComplete: 'new-password',
    validate: validatePassword,
  },
  { name: 'phone', label: 'Teléfono', type: 'tel', autoComplete: 'tel' },
  { name: 'specialty', label: 'Especialidad' },
  { name: 'licenseNumber', label: 'Matrícula' },
]

export function RegisterCoachForm() {
  const createCoach = useCreateCoach()
  const login = useLogin()
  const [formError, setFormError] = useState<string>()
  const navigate = useNavigate()

  // después de registrarse inicia sesión con los mismos datos y entra al dashboard
  const signInAfterRegister = async (email: string, password: string) => {
    try {
      await login.mutateAsync({ email, password })
      navigate(paths.dashboard)
    } catch {
      // la cuenta ya existe: si el login automático falla, que ingrese a mano
      navigate(paths.login)
    }
  }

  const form = useForm({
    defaultValues,
    onSubmit: async ({ value, formApi }) => {
      setFormError(undefined)
      const input = toCreateCoachInput(value)
      try {
        await createCoach.mutateAsync(input)
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

        if (error.fieldErrors.length === 0 || unmappedErrors.length > 0) {
          setFormError(error.message)
        }
        return
      }

      await signInAfterRegister(input.email, input.password)
    },
  })

  // el botón sigue deshabilitado mientras corre el login automático
  const isSubmitting = createCoach.isPending || login.isPending

  const handleSubmit: SubmitEventHandler<HTMLFormElement> = (event) => {
    event.preventDefault()
    void form.handleSubmit()
  }

  return (
    <form noValidate className="flex flex-col gap-4" onSubmit={handleSubmit}>
      {textFields.map(({ name, label, type, autoComplete, validate }) => (
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
                required={Boolean(validate)}
              >
                <TextInput
                  id={fieldId(name)}
                  name={name}
                  type={type}
                  autoComplete={autoComplete}
                  value={field.state.value}
                  onChange={(event) => field.handleChange(event.target.value)}
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
      ))}

      <form.Field name="bio">
        {(field) => {
          const error = field.state.meta.errors[0] as string | undefined
          return (
            <FormField label="Biografía" htmlFor={fieldId('bio')} error={error}>
              <TextArea
                id={fieldId('bio')}
                name="bio"
                rows={4}
                value={field.state.value}
                onChange={(event) => field.handleChange(event.target.value)}
                onBlur={field.handleBlur}
                aria-invalid={Boolean(error)}
                aria-describedby={
                  error ? getFieldErrorId(fieldId('bio')) : undefined
                }
              />
            </FormField>
          )
        }}
      </form.Field>

      {formError && (
        <p
          role="alert"
          className="bg-danger/10 text-danger rounded-md p-3 text-sm"
        >
          {formError}
        </p>
      )}

      <PrimaryButton type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Registrando...' : 'Registrarme'}
      </PrimaryButton>
    </form>
  )
}
