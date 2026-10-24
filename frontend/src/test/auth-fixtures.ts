import type { AuthResponse, AuthUser, Role, Session } from '../lib/auth'

// datos de prueba de autenticación con la forma que devuelve el backend
const users: Record<Role, AuthUser> = {
  COACH: {
    id: 'f14b8801-422f-4411-bdf4-e7a4f3ac3c4c',
    firstName: 'Ana',
    lastName: 'Pérez',
    email: 'ana@example.com',
    role: 'COACH',
  },
  ATHLETE: {
    id: '0a6d2b9e-7c51-4c1e-9d3f-2b8e5f6a7c10',
    firstName: 'Leo',
    lastName: 'Gil',
    email: 'leo@example.com',
    role: 'ATHLETE',
  },
}

export const authResponse = (
  role: Role = 'COACH',
  tokens: { accessToken?: string; refreshToken?: string } = {},
): AuthResponse => ({
  accessToken: tokens.accessToken ?? 'access-1',
  tokenType: 'Bearer',
  expiresIn: 900,
  refreshToken: tokens.refreshToken ?? 'refresh-1',
  refreshExpiresIn: 7200,
  role,
  user: users[role],
})

export const session = (
  role: Role = 'COACH',
  tokens: { accessToken?: string; refreshToken?: string } = {},
): Session => {
  const { accessToken, refreshToken, user } = authResponse(role, tokens)
  return { accessToken, refreshToken, user }
}
