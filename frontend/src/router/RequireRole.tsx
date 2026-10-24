import { Navigate, Outlet } from 'react-router-dom'
import { useAuth, type Role } from '../lib/auth'
import { paths } from './paths'

type RequireRoleProps = {
  roles: readonly Role[]
}

// rutas de un solo rol (US-04). Va dentro de RequireAuth, que ya resuelve la falta de sesión;
// con otro rol vuelve al dashboard, que muestra el panel que le corresponde.
// Es solo para la UI: si alguien llama a la API directo, el backend igual responde 403
export function RequireRole({ roles }: RequireRoleProps) {
  const { user } = useAuth()

  if (!user) return <Navigate to={paths.login} replace />
  return roles.includes(user.role) ? (
    <Outlet />
  ) : (
    <Navigate to={paths.dashboard} replace />
  )
}
