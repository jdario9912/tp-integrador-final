import type { PageResponse } from '../lib/api'
import type { ProgressPhoto } from '../lib/progress-photos'

// URL que vence en 2099: no se renueva en las pruebas salvo que se pida
export const FUTURE_EXPIRY = '2099-01-01T00:00:00Z'
// URL ya vencida: dispara la renovación al mostrarse
export const PAST_EXPIRY = '2000-01-01T00:00:00Z'

// foto con la forma de ProgressPhotoResponse (contrato de US-28, 2)
export const progressPhoto = (
  overrides: Partial<ProgressPhoto> = {},
): ProgressPhoto => ({
  id: '9b1e4c7a-2d3f-4a5b-8c6d-7e8f9a0b1c2d',
  type: 'FRONT',
  takenOn: '2026-11-12',
  url: 'https://storage.example.com/fotos/frente-1.jpg?token=viejo',
  urlExpiresAt: FUTURE_EXPIRY,
  createdAt: '2026-11-12T20:14:31.123456Z',
  ...overrides,
})

// página de GET /athletes/{athleteId}/photos
export const progressPhotosPage = (
  content: ProgressPhoto[] = [progressPhoto()],
  overrides: Partial<PageResponse<ProgressPhoto>> = {},
): PageResponse<ProgressPhoto> => ({
  content,
  page: 0,
  size: 20,
  totalElements: content.length,
  totalPages: content.length > 0 ? 1 : 0,
  ...overrides,
})
