import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../../../lib/auth'
import { getFood } from '../actions/get-food'

// bajo ['foods']: el invalidate del alta y la edición también refresca el detalle
export const foodDetailKey = (id: string) => ['foods', 'detail', id]

export const useFood = (id: string) => {
  const { user } = useAuth()
  return useQuery({
    queryKey: foodDetailKey(id),
    queryFn: () => getFood(id),
    enabled: user !== null,
  })
}
