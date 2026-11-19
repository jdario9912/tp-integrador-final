import { useForm } from '@tanstack/react-form'
import { useState, type SubmitEventHandler } from 'react'
import { isApiError } from '../../../lib/api'
import { validateEmail } from '../../../lib/validation'
import { PrimaryButton } from '../../../ui/button'
import { Callout } from '../../../ui/callout'
import { FormField, getFieldErrorId } from '../../../ui/form-field'
import { Mail } from '../../../ui/icons'
import { TextInput } from '../../../ui/input'
import { useRequestPasswordRecovery } from '../hooks/use-request-password-recovery'

const EMAIL_ID = 'forgot-password-email'

type ForgotPasswordFormProps = {
  // el pedido salió (202): la página muestra la confirmación
  onSent: (email: string) => void
}

// US-44: pide el enlace para crear una contraseña nueva. El 202 no dice si el email existe
export function ForgotPasswordForm({ onSent }: ForgotPasswordFormProps) {
  const recovery = useRequestPasswordRecovery()
  const [formError, setFormError] = useState<string>()

  const form = useForm({
    defaultValues: { email: '' },
    onSubmit: async ({ value, formApi }) => {
      setFormError(undefined)
      const email = value.email.trim()
      try {
        await recovery.mutateAsync({ email })
        onSent(email)
      } catch (error) {
        if (!isApiError(error)) {
          setFormError('Ocurrió un error inesperado. Intentá nuevamente.')
          return
        }
        // 400 con el error en el campo; el 503 (no se pudo enviar el mail) y el resto, al aviso
        const emailError = error.fieldErrors.find((e) => e.field === 'email')
        if (emailError) {
          formApi.setFieldMeta('email', (meta) => ({
            ...meta,
            errorMap: { ...meta.errorMap, onServer: emailError.message },
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

  return (
    <form noValidate className="flex flex-col gap-5" onSubmit={handleSubmit}>
      <form.Field name="email" validators={{ onBlur: validateEmail }}>
        {(field) => {
          const error = field.state.meta.errors[0] as string | undefined
          return (
            <FormField label="Email" htmlFor={EMAIL_ID} error={error} required>
              <TextInput
                id={EMAIL_ID}
                name="email"
                type="email"
                autoComplete="email"
                leadingIcon={<Mail />}
                className="h-13 text-base"
                value={field.state.value}
                onChange={(event) => field.handleChange(event.target.value)}
                onBlur={field.handleBlur}
                aria-invalid={Boolean(error)}
                aria-describedby={error ? getFieldErrorId(EMAIL_ID) : undefined}
              />
            </FormField>
          )
        }}
      </form.Field>

      {formError && <Callout tone="danger">{formError}</Callout>}

      <PrimaryButton type="submit" size="lg" disabled={recovery.isPending}>
        {recovery.isPending ? 'Enviando...' : 'Enviar enlace'}
      </PrimaryButton>
    </form>
  )
}
