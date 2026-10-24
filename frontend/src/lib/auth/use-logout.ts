import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { isApiError } from '../api'
import { paths } from '../../router/paths'
import { logout } from './logout'
import { useAuth } from './use-auth'

// Se avisa siempre que el servidor no confirmó el cierre: sin respuesta (red) o cualquier
// error (404, 5xx, ...), porque en esos casos el refresh token puede seguir vigente.
// Un 401 cuenta como éxito porque el interceptor ya intentó refrescar y la sesión del
// servidor ya no existía.
const logoutFailed = (error: unknown) =>
  error != null && !(isApiError(error) && error.status === 401)

export const useLogout = () => {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const { signOut } = useAuth()

  return useMutation({
    mutationFn: logout,
    // siempre se cierra la sesión local, aunque el backend no haya respondido
    onSettled: (_data, error) => {
      queryClient.clear()
      signOut()
      // flushSync: sin esto RequireAuth redirige al detectar la sesión borrada y
      // la navegación con el aviso pierde el state
      navigate(paths.login, {
        replace: true,
        flushSync: true,
        state: logoutFailed(error) ? { logoutFailed: true } : undefined,
      })
    },
  })
}
