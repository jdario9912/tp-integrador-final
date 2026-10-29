import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../../../lib/auth'
import { setAthleteActive } from '../actions/set-athlete-active'
import { athleteDetailKey } from './use-athlete'

// la respuesta trae el atleta actualizado: se guarda directo en el detalle para que el
// estado de la cuenta cambie sin esperar otro GET
export const useSetAthleteActive = (id: string) => {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (active: boolean) => setAthleteActive(id, active),
    onSuccess: (athlete) => {
      queryClient.setQueryData(athleteDetailKey(user?.id, id), athlete)
      return queryClient.invalidateQueries({
        queryKey: ['athletes'],
        // el detalle ya está al día
        predicate: ({ queryKey }) => !queryKey.includes('detail'),
      })
    },
  })
}
