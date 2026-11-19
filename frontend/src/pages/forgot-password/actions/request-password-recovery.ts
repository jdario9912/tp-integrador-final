import { post } from '../../../lib/api'
import { PASSWORD_RECOVERY_URL } from '../../../lib/auth'
import type { PasswordRecoveryInput } from '../types'

// US-44: responde 202 sin body exista o no el email (no revela si está registrado) y 503 si no
// pudo enviar el mail
export const requestPasswordRecovery = (input: PasswordRecoveryInput) =>
  post<void, PasswordRecoveryInput>(PASSWORD_RECOVERY_URL, input)
