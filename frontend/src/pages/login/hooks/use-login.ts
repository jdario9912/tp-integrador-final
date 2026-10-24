import { useMutation } from '@tanstack/react-query'
import { useAuth } from '../../../lib/auth'
import { login } from '../actions/login'

// guarda la sesión al loguearse; la navegación la decide quien lo usa
export const useLogin = () => {
  const { signIn } = useAuth()
  return useMutation({ mutationFn: login, onSuccess: signIn })
}
