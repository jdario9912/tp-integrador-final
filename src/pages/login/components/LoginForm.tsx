import { useForm } from '@tanstack/react-form'
import { useState, type SubmitEventHandler } from 'react'
import { isApiError } from '../../../lib/api'
import { validateEmail, validateRequired } from '../../../lib/validation'
import { PrimaryButton } from '../../../ui/button'
import { FormField, getFieldErrorId } from '../../../ui/form-field'
import { TextInput } from '../../../ui/input'
import { useLogin } from '../hooks/use-login'
import type { LoginFormValues } from '../types'

type FieldName = keyof LoginFormValues

const defaultValues: LoginFormValues = { email: '', password: '' }

const isFieldName = (field: string): field is FieldName =>
  Object.hasOwn(defaultValues, field)

const fieldId = (name: FieldName) => `login-${name}`

const fields: {
  name: FieldName
  label: string
  type: string
  autoComplete: string
  validate: (field: { value: string }) => string | undefined
}[] = [
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
    autoComplete: 'current-password',
    // sin largo mínimo: eso se valida al registrarse, acá solo se compara
    validate: validateRequired('La contraseña es obligatoria'),
  },
]

// al loguearse se guarda la sesión y LoginPage redirige al dashboard
export function LoginForm() {
  const loginMutation = useLogin()
  const [formError, setFormError] = useState<string>()

  const form = useForm({
    defaultValues,
    onSubmit: async ({ value, formApi }) => {
      setFormError(undefined)
      try {
        // la contraseña se envía tal cual: los espacios pueden ser intencionales
        await loginMutation.mutateAsync({
          email: value.email.trim(),
          password: value.password,
        })
      } catch (error) {
        if (!isApiError(error)) {
          setFormError('Ocurrió un error inesperado. Intentá nuevamente.')
          return
        }

        // 401 (credenciales inválidas) y 403 (cuenta desactivada) llegan sin errores por campo
        const unmappedErrors = error.fieldErrors.filter(
          ({ field }) => !isFieldName(field),
        )
        error.fieldErrors.forEach(({ field, message }) => {
          if (!isFieldName(field)) return
          formApi.setFieldMeta(field, (meta) => ({
            ...meta,
            errorMap: { ...meta.errorMap, onServer: message },
          }))
        })

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
    <form noValidate className="flex flex-col gap-4" onSubmit={handleSubmit}>
      {fields.map(({ name, label, type, autoComplete, validate }) => (
        <form.Field key={name} name={name} validators={{ onBlur: validate }}>
          {(field) => {
            const error = field.state.meta.errors[0] as string | undefined
            return (
              <FormField
                label={label}
                htmlFor={fieldId(name)}
                error={error}
                required
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

      {formError && (
        <p
          role="alert"
          className="bg-danger/10 text-danger rounded-md p-3 text-sm"
        >
          {formError}
        </p>
      )}

      <PrimaryButton type="submit" disabled={loginMutation.isPending}>
        {loginMutation.isPending ? 'Ingresando...' : 'Ingresar'}
      </PrimaryButton>
    </form>
  )
}
