import { useMutation } from '@tanstack/react-query'
import type { ChangeOwnPasswordInput } from './types'
import { changeOwnPassword } from './change-own-password'

export const useChangeOwnPassword = () =>
  useMutation({
    // solo la entrada: TanStack pasa además el contexto de la mutación
    mutationFn: (input: ChangeOwnPasswordInput) => changeOwnPassword(input),
  })
