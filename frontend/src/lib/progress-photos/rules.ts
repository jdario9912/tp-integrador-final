import type { ProgressPhotoType } from './types'

// reglas espejo de la validación del backend (contrato de US-28, 7.1). El servidor es la
// autoridad: esto solo da feedback antes de subir
export const PROGRESS_PHOTO_MAX_BYTES = 5 * 1024 * 1024

export const PROGRESS_PHOTO_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
] as const

// por si el navegador no informa el tipo MIME del archivo
export const PROGRESS_PHOTO_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp']

// orden de los tipos en pantalla: frontal, lateral y espalda
export const PROGRESS_PHOTO_TYPE_OPTIONS: {
  value: ProgressPhotoType
  label: string
}[] = [
  { value: 'FRONT', label: 'Frontal' },
  { value: 'SIDE', label: 'Lateral' },
  { value: 'BACK', label: 'Espalda' },
]

export const progressPhotoTypeLabel = (type: ProgressPhotoType) =>
  PROGRESS_PHOTO_TYPE_OPTIONS.find((option) => option.value === type)?.label ??
  type
