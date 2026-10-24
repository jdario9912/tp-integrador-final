import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { paths } from './paths'

// rutas que exigen sesión. Si la sesión expira (refresh vencido) también vuelve al login.
// Los permisos por rol se agregan en la US-04
export function RequireAuth() {
  const { isAuthenticated } = useAuth()
  return isAuthenticated ? <Outlet /> : <Navigate to={paths.login} replace />
}
