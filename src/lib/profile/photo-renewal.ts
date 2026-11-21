import {
  URL_RENEWAL_MARGIN_MS,
  isUrlExpired,
} from '../progress-photos/url-expiry'
import type { OwnProfile } from './types'

// URL de la foto que se puede mostrar ahora: null si no hay foto o ya venció (con margen).
// Mientras se renueva, el avatar muestra las iniciales en lugar de una imagen rota
export const currentPhotoUrl = (profile: OwnProfile | undefined) => {
  if (!profile?.photoUrl || !profile.photoUrlExpiresAt) return null
  return isUrlExpired(profile.photoUrlExpiresAt) ? null : profile.photoUrl
}

// milisegundos hasta pedir el perfil de nuevo para renovar la URL (cero o menos: ya toca)
export const renewalDelayMs = (expiresAt: string, now = Date.now()) =>
  Date.parse(expiresAt) - URL_RENEWAL_MARGIN_MS - now
