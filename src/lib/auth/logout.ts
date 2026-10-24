import { post } from '../api'

// cierra la sesión en el backend: revoca el refresh token de la sesión actual
export const logout = () => post<void>('/auth/logout', undefined)
