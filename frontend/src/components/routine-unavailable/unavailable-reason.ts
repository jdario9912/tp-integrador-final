import { isApiError } from '../../lib/api'
import type { UnavailableReason } from './RoutineUnavailable'

// 404: no existe. 400: el id de la URL no es un UUID, para el usuario es lo mismo.
// 403: es de otro entrenador. Ninguno cambia al reintentar
export const unavailableReason = (
  error: Error,
): UnavailableReason | undefined => {
  if (!isApiError(error)) return undefined
  if (error.status === 403) return 'forbidden'
  if (error.status === 400 || error.status === 404) return 'not-found'
  return undefined
}
