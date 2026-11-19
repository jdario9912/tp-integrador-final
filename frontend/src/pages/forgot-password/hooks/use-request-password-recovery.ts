import { useMutation } from '@tanstack/react-query'
import { requestPasswordRecovery } from '../actions/request-password-recovery'

export const useRequestPasswordRecovery = () =>
  useMutation({ mutationFn: requestPasswordRecovery })
