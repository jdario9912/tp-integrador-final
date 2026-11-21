import { put } from '../api'
import type { ChangeOwnPasswordInput } from './types'

// 204: sin cuerpo. La sesión actual sigue activa (una sola sesión por usuario)
export const changeOwnPassword = (input: ChangeOwnPasswordInput) =>
  put<void, ChangeOwnPasswordInput>('/users/me/password', input)
