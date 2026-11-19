import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../auth'
import { handleAlert } from './handle-alert'
import { alertsKey } from './use-alerts'

// se refresca la lista pase lo que pase: atendida (200), ya atendida (409), ajena (403) o
// inexistente (404), en ningún caso sigue entre las pendientes que se pueden atender
export const useHandleAlert = () => {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  return useMutation({
    mutationFn: handleAlert,
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: alertsKey(user?.id) }),
  })
}
