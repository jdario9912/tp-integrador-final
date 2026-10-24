import { post } from '../../../lib/api'
import type { AuthResponse } from '../../../lib/auth'
import type { LoginInput } from '../types'

export const login = (input: LoginInput) =>
  post<AuthResponse, LoginInput>('/auth/login', input)
