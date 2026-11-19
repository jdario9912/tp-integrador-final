import { useEffect, useState } from 'react'
import { useAuth } from '../../lib/auth'
import { AuthLayout } from '../../layout'
import { Navigate, useLocation, useNavigate } from '../../lib/navigation'
import { paths } from '../../router/paths'
import { Callout } from '../../ui/callout'
import { TextLink } from '../../ui/text-link'
import { LoginForm } from './components/LoginForm'

// logoutFailed: el servidor no confirmó el cierre de sesión. passwordReset: se acaba de cambiar la
// contraseña desde el link del mail (US-44)
type LoginLocationState = { logoutFailed?: boolean; passwordReset?: boolean }

export function LoginPage() {
  const { isAuthenticated } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  // el aviso se lee una sola vez y después se limpia el state: el navegador lo conserva al
  // recargar y el aviso volvería a aparecer aunque ya no corresponda
  const [{ logoutFailed, passwordReset }] = useState(() => {
    const state = location.state as LoginLocationState | null
    return {
      logoutFailed: state?.logoutFailed === true,
      passwordReset: state?.passwordReset === true,
    }
  })

  useEffect(() => {
    if (location.state) {
      navigate(location.pathname, { replace: true, state: null })
    }
  }, [location.pathname, location.state, navigate])

  // con sesión (recién logueado o ya logueado de antes) va directo al dashboard
  if (isAuthenticated) return <Navigate to={paths.dashboard} replace />

  return (
    <AuthLayout
      title="Iniciar sesión"
      description="Ingresá con tu email y contraseña."
    >
      {logoutFailed && (
        <Callout tone="warning" role="status">
          Cerraste sesión en este dispositivo, pero no pudimos confirmarlo con
          el servidor.
        </Callout>
      )}
      {passwordReset && (
        <Callout tone="success" role="status">
          Actualizaste tu contraseña. Iniciá sesión con la nueva.
        </Callout>
      )}
      <LoginForm />
      <TextLink to={paths.forgotPassword} className="self-center text-[15px]">
        ¿Olvidaste tu contraseña?
      </TextLink>
      <p className="text-muted-foreground text-center text-[15px]">
        ¿Sos entrenador y no tenés cuenta?{' '}
        <TextLink to={paths.registerCoach} className="text-[15px]">
          Registrate
        </TextLink>
      </p>
    </AuthLayout>
  )
}
