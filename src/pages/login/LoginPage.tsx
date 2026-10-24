import { Link, Navigate } from 'react-router-dom'
import { useAuth } from '../../lib/auth'
import { paths } from '../../router/paths'
import { LoginForm } from './components/LoginForm'

export function LoginPage() {
  const { isAuthenticated } = useAuth()

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
