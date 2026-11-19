import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../../../lib/auth'
import { resetPassword } from '../actions/reset-password'

// al cambiar la contraseña el backend revoca todas las sesiones del usuario: si en este navegador
// había una guardada, se borra junto con la caché para que vuelva a iniciar sesión
export const useResetPassword = () => {
  const queryClient = useQueryClient()
  const { signOut } = useAuth()
  return useMutation({
    mutationFn: resetPassword,
    onSuccess: () => {
      queryClient.clear()
      signOut()
    },
  })
}
