export {
  ApiError,
  isApiError,
  type ApiErrorResponse,
  type FieldError,
} from './api-error'
export { del, get, getOptional, patch, post, put } from './client'
export type { PageResponse } from './page-response'
// US-28: envío multipart (fotos de progreso y, después, de comidas)
export { postForm } from './client'
// US-48: PUT multipart (foto de perfil)
export { putForm } from './client'
