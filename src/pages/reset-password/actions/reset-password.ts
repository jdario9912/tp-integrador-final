import { post } from '../../../lib/api'
import { PASSWORD_RESET_URL } from '../../../lib/auth'
import type { PasswordResetInput } from '../types'

// US-44: 204 si sale bien (el backend revoca todas las sesiones del usuario); 400 con fieldErrors
// en newPassword si no cumple la política, o 400 solo con message si el token venció, ya se usó o
// no es válido
export const resetPassword = (input: PasswordResetInput) =>
  post<void, PasswordResetInput>(PASSWORD_RESET_URL, input)
