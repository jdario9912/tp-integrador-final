export type Role = 'COACH' | 'ATHLETE'

export type AuthUser = {
  id: string
  firstName: string
  lastName: string
  email: string
  role: Role
}

// respuesta de POST /auth/login y POST /auth/refresh (los tiempos están en segundos)
export type AuthResponse = {
  accessToken: string
  tokenType: 'Bearer'
  expiresIn: number
  refreshToken: string
  refreshExpiresIn: number
  role: Role
  user: AuthUser
}

// lo que se guarda en el navegador para mantener la sesión entre recargas
export type Session = {
  accessToken: string
  refreshToken: string
  user: AuthUser
}

export const toSession = ({
  accessToken,
  refreshToken,
  user,
}: AuthResponse): Session => ({ accessToken, refreshToken, user })
