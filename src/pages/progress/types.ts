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

// US-45: formulario de medidas. Cada medida guarda su texto por la clave de su campo
// (WAIST, ARM-LEFT...); vacío significa que no se mide
export type BodyMeasurementFormValues = {
  // YYYY-MM-DD, el formato de <input type="date">
  date: string
  comment: string
  measurements: Record<string, string>
}
