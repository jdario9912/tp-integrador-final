import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../../../lib/auth'
import { getAthlete } from '../actions/get-athlete'

// bajo ['athletes']: el invalidate de las mutaciones de atletas también refresca el detalle
export const athleteDetailKey = (userId: string | undefined, id: string) => [
  'athletes',
  userId,
  'detail',
  id,
]

export const useAthlete = (id: string) => {
  const { user } = useAuth()
  return useQuery({
    queryKey: athleteDetailKey(user?.id, id),
    queryFn: () => getAthlete(id),
    enabled: user !== null,
  })
}
