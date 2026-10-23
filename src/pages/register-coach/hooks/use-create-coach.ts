import { useMutation } from '@tanstack/react-query'
import { createCoach } from '../actions/create-coach'

export const useCreateCoach = () => useMutation({ mutationFn: createCoach })
