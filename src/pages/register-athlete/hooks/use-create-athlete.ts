import { useMutation } from '@tanstack/react-query'
import { createAthlete } from '../actions/create-athlete'

export const useCreateAthlete = () => useMutation({ mutationFn: createAthlete })
