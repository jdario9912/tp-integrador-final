import type { Role } from '../auth/types'

// UserProfileResponse (contrato de US-48): solo los datos comunes de User. Los datos deportivos
// del atleta los edita el entrenador (US-07)
export type OwnProfile = {
  id: string
  role: Role
  firstName: string
  lastName: string
  email: string
  phone: string | null
  // URL firmada de lectura, o null si no hay foto. Vence en photoUrlExpiresAt
  photoUrl: string | null
  photoUrlExpiresAt: string | null
}

export type UpdateOwnProfileInput = {
  firstName: string
  lastName: string
  email: string
  phone: string | null
}

export type ChangeOwnPasswordInput = {
  currentPassword: string
  newPassword: string
}
