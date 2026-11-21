import type { OwnProfile } from '../lib/profile'

// URL firmada que vence en 2099: no se renueva en las pruebas salvo que se pida
export const FUTURE_PHOTO_EXPIRY = '2099-01-01T00:00:00Z'
// URL ya vencida: dispara la renovación al mostrarse
export const PAST_PHOTO_EXPIRY = '2000-01-01T00:00:00Z'

// perfil propio con la forma de UserProfileResponse (contrato de US-48), sin foto por defecto
export const ownProfile = (
  overrides: Partial<OwnProfile> = {},
): OwnProfile => ({
  id: '0a6d2b9e-7c51-4c1e-9d3f-2b8e5f6a7c10',
  role: 'ATHLETE',
  firstName: 'Leo',
  lastName: 'Gil',
  email: 'leo@example.com',
  phone: null,
  photoUrl: null,
  photoUrlExpiresAt: null,
  ...overrides,
})
