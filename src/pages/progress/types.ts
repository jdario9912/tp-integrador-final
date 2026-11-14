import type { ProgressPhotoType } from '../../lib/progress-photos'

// en el formulario todos los campos son strings, como los devuelven los inputs
export type WeightFormValues = {
  // YYYY-MM-DD, el formato de <input type="date">
  date: string
  weightKg: string
  comment: string
}

export type WeightFieldName = keyof WeightFormValues

// US-28: formulario de subida de una foto de progreso. El archivo no es string
export type PhotoFormValues = {
  type: ProgressPhotoType
  // YYYY-MM-DD, el formato de <input type="date">
  takenOn: string
  file: File | null
}

export type PhotoFieldName = keyof PhotoFormValues
