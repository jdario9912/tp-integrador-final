import { useForm } from '@tanstack/react-form'
import { useState, type SubmitEventHandler } from 'react'
import { isApiError } from '../../../lib/api'
import { useNavigate } from '../../../lib/navigation'
import { validatePassword } from '../../../lib/validation'
import { paths } from '../../../router/paths'
import { PrimaryButton } from '../../../ui/button'
import { Callout } from '../../../ui/callout'
import { FormField, getFieldErrorId } from '../../../ui/form-field'
import { Lock } from '../../../ui/icons'
import { TextInput } from '../../../ui/input'
import { useResetPassword } from '../hooks/use-reset-password'
import type { ResetPasswordFormValues } from '../types'

type FieldName = keyof ResetPasswordFormValues

const fieldId = (name: FieldName) => `reset-password-${name}`

const defaultValues: ResetPasswordFormValues = {
  newPassword: '',
  confirmPassword: '',
}

type ResetPasswordFormProps = {
  token: string
  // 400 sin errores por campo: el token venció, ya se usó o no es válido
  onInvalidToken: (message: string) => void
}

// US-44: segundo paso de la recuperación. Con el 204 lleva al login, que avisa del cambio
export function ResetPasswordForm({
  token,
  onInvalidToken,
}: ResetPasswordFormProps) {
  const reset = useResetPassword()
  const navigate = useNavigate()
  const [formError, setFormError] = useState<string>()

  const form = useForm({
    defaultValues,
    onSubmit: async ({ value, formApi }) => {
      setFormError(undefined)
      try {
        // la contraseña se envía tal cual: los espacios pueden ser intencionales
        await reset.mutateAsync({ token, newPassword: value.newPassword })
        navigate(paths.login, { replace: true, state: { passwordReset: true } })
      } catch (error) {
        if (!isApiError(error)) {
          setFormError('Ocurrió un error inesperado. Intentá nuevamente.')
          return
        }
        if (error.status === 400 && error.fieldErrors.length === 0) {
          onInvalidToken(error.message)
          return
        }
        const passwordError = error.fieldErrors.find(
          ({ field }) => field === 'newPassword',
        )
        if (passwordError) {
          formApi.setFieldMeta('newPassword', (meta) => ({
            ...meta,
            errorMap: { ...meta.errorMap, onServer: passwordError.message },
          }))
          return
        }
        setFormError(error.message)
      }
    },
  })

  const handleSubmit: SubmitEventHandler<HTMLFormElement> = (event) => {
    event.preventDefault()
    void form.handleSubmit()
  }

  const passwordInput = (
    name: FieldName,
    label: string,
    validate: (field: { value: string }) => string | undefined,
    // la confirmación se vuelve a validar cuando cambia la contraseña
    listenTo?: FieldName,
  ) => (
    <form.Field
      name={name}
      validators={{
        onBlur: validate,
        ...(listenTo && {
          onChangeListenTo: [listenTo],
          onChange: ({ value, fieldApi }) =>
            fieldApi.state.meta.isBlurred ? validate({ value }) : undefined,
        }),
      }}
    >
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
              type="password"
              autoComplete="new-password"
              leadingIcon={<Lock />}
              className="h-13 text-base"
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
  )

  return (
    <form noValidate className="flex flex-col gap-5" onSubmit={handleSubmit}>
      {passwordInput('newPassword', 'Nueva contraseña', validatePassword)}
      {passwordInput(
        'confirmPassword',
        'Repetir contraseña',
        ({ value }) => {
          if (!value) return 'Repetí la contraseña'
          if (value !== form.getFieldValue('newPassword'))
            return 'Las contraseñas no coinciden'
          return undefined
        },
        'newPassword',
      )}

      {formError && <Callout tone="danger">{formError}</Callout>}

      <PrimaryButton type="submit" size="lg" disabled={reset.isPending}>
        {reset.isPending ? 'Guardando...' : 'Guardar contraseña'}
      </PrimaryButton>
    </form>
  )
}
