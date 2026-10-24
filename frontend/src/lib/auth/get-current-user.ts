import { get } from '../api'
import type { AuthUser } from './types'

export const getCurrentUser = () => get<AuthUser>('/auth/me')
