import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../auth'
import { createNote } from './create-note'
import type { NoteInput } from './types'
import { notesKey } from './use-notes'

// devuelve la promesa del invalidate: la mutación termina cuando la lista ya se actualizó
export const useCreateNote = (athleteId: string) => {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  return useMutation({
    mutationFn: (input: NoteInput) => createNote(athleteId, input),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: notesKey(user?.id, athleteId),
      }),
  })
}
