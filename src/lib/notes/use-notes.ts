import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../auth'
import { getNotes } from './get-notes'

// el usuario va en la clave: el entrenador y el atleta ven listas distintas del mismo atleta
export const notesKey = (userId: string | undefined, athleteId: string) =>
  ['notes', userId, athleteId] as const

export const useNotes = (athleteId: string) => {
  const { user } = useAuth()
  return useQuery({
    queryKey: notesKey(user?.id, athleteId),
    queryFn: () => getNotes(athleteId),
    enabled: user !== null && athleteId !== '',
  })
}
