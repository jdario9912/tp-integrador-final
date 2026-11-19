import { useState } from 'react'
import { AuthLayout } from '../../layout'
import { useSearchParams } from '../../lib/navigation'
import { paths } from '../../router/paths'
import { ArrowLeft } from '../../ui/icons'
import { TextLink } from '../../ui/text-link'
import { InvalidResetLink } from './components/InvalidResetLink'
import { ResetPasswordForm } from './components/ResetPasswordForm'

const MISSING_TOKEN =
  'El enlace no es válido. Revisá que lo hayas copiado completo o pedí uno nuevo.'

// US-44: se llega desde el link del mail (/reset-password?token=...). Se puede abrir con una
// sesión guardada: al cambiar la contraseña se cierra
export function ResetPasswordPage() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')?.trim() ?? ''
  // mensaje del backend cuando el token venció, ya se usó o no es válido
  const [invalidMessage, setInvalidMessage] = useState<string>()

  const invalid = token ? invalidMessage : MISSING_TOKEN

  return (
    <AuthLayout
      title="Crear una contraseña nueva"
      description={
        invalid
          ? undefined
          : 'Elegí una contraseña de al menos 8 caracteres. Después vas a tener que iniciar sesión de nuevo.'
      }
    >
      {invalid ? (
        <InvalidResetLink message={invalid} />
      ) : (
        <ResetPasswordForm token={token} onInvalidToken={setInvalidMessage} />
      )}
      <TextLink to={paths.login} className="self-center text-[15px]">
        <ArrowLeft aria-hidden="true" /> Volver a iniciar sesión
      </TextLink>
    </AuthLayout>
  )
}
