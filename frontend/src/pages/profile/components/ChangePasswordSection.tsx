import { useForm } from '@tanstack/react-form'
import { useState, type SubmitEventHandler } from 'react'
import {
  useChangeOwnPassword,
  type ChangeOwnPasswordInput,
} from '../../../lib/profile'
import { validatePassword } from '../../../lib/validation'
import { PrimaryButton } from '../../../ui/button'
import { Callout } from '../../../ui/callout'
import { SectionCard } from '../../../ui/card'
import { FormField, getFieldErrorId } from '../../../ui/form-field'
import { Lock } from '../../../ui/icons'
import { TextInput } from '../../../ui/input'
import { PASSWORD_CHANGED_MESSAGE } from '../messages'
import { distributeServerErrors } from '../server-errors'
import { validateConfirmPassword, validateCurrentPassword } from '../validation'

type FieldName = keyof ChangeOwnPasswordInput | 'confirmPassword'

type PasswordValues = ChangeOwnPasswordInput & { confirmPassword: string }

const FIELD_NAMES: readonly FieldName[] = ['currentPassword', 'newPassword']

const fieldId = (name: FieldName) => `change-password-${name}`

const defaultValues: PasswordValues = {
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
}

// US-48: cambio con la contraseña actual. Un 400 va al campo que indica el backend
export function ChangePasswordSection() {
  const changePassword = useChangeOwnPassword()
  const [formError, setFormError] = useState<string>()
  const [changed, setChanged] = useState(false)

  const form = useForm({
    defaultValues,
    onSubmit: async ({ value, formApi }) => {
      setFormError(undefined)
      setChanged(false)
      const setFieldError = (name: FieldName, message: string) =>
        formApi.setFieldMeta(name as keyof PasswordValues, (meta) => ({
          ...meta,
          errorMap: { ...meta.errorMap, onServer: message },
        }))
      try {
        // la confirmación no se envía: solo viajan la actual y la nueva
        await changePassword.mutateAsync({
          currentPassword: value.currentPassword,
          newPassword: value.newPassword,
        })
        formApi.reset()
        setChanged(true)
      } catch (error) {
        setFormError(distributeServerErrors(error, FIELD_NAMES, setFieldError))
      }
    },
  })

  const handleSubmit: SubmitEventHandler<HTMLFormElement> = (event) => {
    event.preventDefault()
    void form.handleSubmit()
  }

  const passwordField = (
    name: keyof PasswordValues,
    label: string,
    autoComplete: string,
    validate: (field: { value: string }) => string | undefined,
    // la confirmación se vuelve a validar cuando cambia la nueva contraseña
    listenTo?: keyof PasswordValues,
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
              autoComplete={autoComplete}
              leadingIcon={<Lock />}
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
    <SectionCard title="Cambiar contraseña" icon={<Lock />}>
      <form
        noValidate
        aria-label="Cambiar contraseña"
        className="grid grid-cols-1 gap-5 sm:grid-cols-2"
        onSubmit={handleSubmit}
      >
        <div className="sm:col-span-2">
          {passwordField(
            'currentPassword',
            'Contraseña actual',
            'current-password',
            validateCurrentPassword,
          )}
        </div>
        {passwordField(
          'newPassword',
          'Contraseña nueva',
          'new-password',
          validatePassword,
        )}
        {passwordField(
          'confirmPassword',
          'Repetir contraseña nueva',
          'new-password',
          ({ value }) =>
            validateConfirmPassword(value, form.getFieldValue('newPassword')),
          'newPassword',
        )}

        {formError && (
          <Callout tone="danger" className="sm:col-span-2">
            {formError}
          </Callout>
        )}

        <div className="flex flex-wrap items-center gap-4 sm:col-span-2">
          <PrimaryButton type="submit" disabled={changePassword.isPending}>
            {changePassword.isPending ? 'Guardando...' : 'Cambiar contraseña'}
          </PrimaryButton>
          {changed && (
            <p role="status" className="text-success text-sm font-semibold">
              {PASSWORD_CHANGED_MESSAGE}
            </p>
          )}
        </div>
      </form>
    </SectionCard>
  )
}
