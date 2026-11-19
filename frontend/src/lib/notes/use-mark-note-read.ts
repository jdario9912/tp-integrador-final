import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../auth'
import { markNoteRead } from './mark-note-read'
import { notesKey } from './use-notes'

// se invalida también si falla: un 404 significa que la nota ya no está entre las visibles
export const useMarkNoteRead = (athleteId: string) => {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  return useMutation({
    mutationFn: (noteId: string) => markNoteRead(athleteId, noteId),
    onSettled: () =>
      queryClient.invalidateQueries({
        queryKey: notesKey(user?.id, athleteId),
      }),
  })
}
