import {
  PROGRESS_PHOTO_EXTENSIONS,
  PROGRESS_PHOTO_MAX_BYTES,
  PROGRESS_PHOTO_MIME_TYPES,
} from './rules'
import { formatMegabytes } from './format'

export const PHOTO_REQUIRED_MESSAGE = 'Elegí una foto para subir'
export const PHOTO_EMPTY_MESSAGE = 'El archivo está vacío. Elegí otra foto'
export const PHOTO_FORMAT_MESSAGE =
  'Formato no permitido. Subí una foto en JPG, PNG o WebP'
export const PHOTO_TOO_LARGE_MESSAGE = `La foto supera el tamaño máximo de ${formatMegabytes(PROGRESS_PHOTO_MAX_BYTES)}`

// el formato se mira por el tipo MIME; si el navegador no lo informa, por la extensión
const hasAcceptedFormat = ({ type, name }: File) => {
  if (type)
    return (PROGRESS_PHOTO_MIME_TYPES as readonly string[]).includes(type)
  const lower = name.toLowerCase()
  return PROGRESS_PHOTO_EXTENSIONS.some((extension) =>
    lower.endsWith(extension),
  )
}

// validación previa al envío: devuelve el mensaje del primer problema o undefined
export const validatePhotoFile = (file: File | null | undefined) => {
  if (!file) return PHOTO_REQUIRED_MESSAGE
  if (file.size === 0) return PHOTO_EMPTY_MESSAGE
  if (!hasAcceptedFormat(file)) return PHOTO_FORMAT_MESSAGE
  if (file.size > PROGRESS_PHOTO_MAX_BYTES) return PHOTO_TOO_LARGE_MESSAGE
  return undefined
}
