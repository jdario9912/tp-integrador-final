import { useState } from 'react'
import { useAuth } from '../../lib/auth'
import { AuthLayout } from '../../layout'
import { Navigate } from '../../lib/navigation'
import { paths } from '../../router/paths'
import { ArrowLeft } from '../../ui/icons'
import { TextLink } from '../../ui/text-link'
import { ForgotPasswordForm } from './components/ForgotPasswordForm'
import { RecoverySent } from './components/RecoverySent'

// US-44: primer paso de la recuperación. Con sesión no tiene sentido: va al dashboard, como el login
export function ForgotPasswordPage() {
  const { isAuthenticated } = useAuth()
  // email al que se pidió el enlace; mientras no haya, se muestra el formulario
  const [sentTo, setSentTo] = useState<string>()

  if (isAuthenticated) return <Navigate to={paths.dashboard} replace />

  return (
    <AuthLayout
      title="Recuperar contraseña"
      description={
        sentTo
          ? 'Revisá tu correo.'
          : 'Ingresá tu email y te enviamos un enlace para crear una contraseña nueva.'
      }
    >
      {sentTo ? (
        <RecoverySent
          email={sentTo}
          onChangeEmail={() => setSentTo(undefined)}
        />
      ) : (
        <ForgotPasswordForm onSent={setSentTo} />
      )}
      <TextLink to={paths.login} className="self-center text-[15px]">
        <ArrowLeft aria-hidden="true" /> Volver a iniciar sesión
      </TextLink>
    </AuthLayout>
  )
}
