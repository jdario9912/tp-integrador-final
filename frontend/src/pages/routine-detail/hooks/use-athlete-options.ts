import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../../../lib/auth'
import { getAthleteOptions } from '../actions/get-athlete-options'

// bajo ['athletes']: dar de alta, desactivar o desvincular un atleta también refresca las opciones
export const useAthleteOptions = () => {
  const { user } = useAuth()
  return useQuery({
    queryKey: ['athletes', user?.id, 'options'],
    queryFn: getAthleteOptions,
    enabled: user !== null,
  })
}
