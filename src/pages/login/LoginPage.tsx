import { useEffect, useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../lib/auth'
import { paths } from '../../router/paths'
import { LoginForm } from './components/LoginForm'

type LoginLocationState = { logoutFailed?: boolean }

export function LoginPage() {
  const { isAuthenticated } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  // el aviso se lee una sola vez y después se limpia el state: el navegador lo conserva al
  // recargar y el aviso volvería a aparecer aunque ya no corresponda
  const [logoutFailed] = useState(
    () => (location.state as LoginLocationState | null)?.logoutFailed === true,
  )

  useEffect(() => {
    if (location.state) {
      navigate(location.pathname, { replace: true, state: null })
    }
  }, [location.pathname, location.state, navigate])

  // con sesión (recién logueado o ya logueado de antes) va directo al dashboard
  if (isAuthenticated) return <Navigate to={paths.dashboard} replace />

  return (
    <main className="mx-auto flex max-w-md flex-col gap-6 p-8">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">Iniciar sesión</h1>
        <p className="text-muted-foreground text-sm">
          Ingresá con tu email y contraseña.
        </p>
      </header>
      {logoutFailed && (
        <p
          role="status"
          className="border-border bg-muted rounded-md border p-3 text-sm"
        >
          Cerraste sesión en este dispositivo, pero no pudimos confirmarlo con
          el servidor.
        </p>
      )}
      <LoginForm />
      <p className="text-muted-foreground text-center text-sm">
        ¿Sos entrenador y no tenés cuenta?{' '}
        <Link to={paths.registerCoach} className="text-primary font-medium">
          Registrate
        </Link>
      </p>
    </main>
  )
}
