import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../auth'
import { getAthlete } from './get-athlete'

// bajo ['athletes']: el invalidate de las mutaciones de atletas también refresca el detalle.
// La comparten la ficha y la edición: al pasar de una a otra el atleta se muestra al instante
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
