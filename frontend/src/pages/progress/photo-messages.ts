import { isApiError } from '../../lib/api'

// textos de error de las fotos. El backend ya responde en español (413, 415, 403, 400 con
// fieldErrors); el 503 (Supabase no responde o no está configurado) tiene texto propio
export const PHOTO_UPLOAD_UNAVAILABLE =
  'No pudimos guardar la foto. Intentá nuevamente más tarde.'
export const PHOTO_LIST_UNAVAILABLE =
  'No pudimos cargar tus fotos. Intentá nuevamente más tarde.'
// US-30: el mismo aviso en la vista del entrenador, donde las fotos no son "tuyas"
export const ATHLETE_PHOTO_LIST_UNAVAILABLE =
  'No pudimos cargar las fotos del atleta. Intentá nuevamente más tarde.'
export const PHOTO_DELETE_UNAVAILABLE =
  'No pudimos borrar la foto. Intentá nuevamente más tarde.'
export const PHOTO_UNEXPECTED_ERROR =
  'Ocurrió un error inesperado. Intentá nuevamente.'
export const PHOTO_ALREADY_GONE =
  'Esa foto ya no existe. La quitamos de la lista.'

type PhotoErrorTexts = { unavailable: string; fallback: string }

// el mensaje para mostrar: el del backend si es un error de API con texto, o el genérico
export const photoErrorMessage = (
  error: unknown,
  { unavailable, fallback }: PhotoErrorTexts,
) => {
  if (!isApiError(error)) return fallback
  if (error.status === 503) return unavailable
  return error.message || fallback
}
