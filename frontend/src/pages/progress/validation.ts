import { normalizeDecimal } from '../../lib/decimal'
import { todayInAppTimeZone } from '../../lib/iso-date'

// validadores espejo del backend (POST/PUT /athletes/{athleteId}/weights, contrato 8.3),
// con los mismos mensajes
type FieldValue = { value: string }

export const WEIGHT_MIN_KG = 20
export const WEIGHT_MAX_KG = 300
export const COMMENT_MAX_LENGTH = 500

// numeric(5,2) en la base: hasta 3 enteros y 2 decimales
const WEIGHT_PATTERN = /^\d{1,3}(\.\d{1,2})?$/

export const validateWeightDate = ({ value }: FieldValue) => {
  if (!value) return 'La fecha es obligatoria'
  // "hoy" en la zona de la app, no en la del navegador (8.8); las fechas ISO se comparan como strings
  if (value > todayInAppTimeZone()) return 'La fecha no puede ser futura'
  return undefined
}

export const validateWeightKg = ({ value }: FieldValue) => {
  const normalized = normalizeDecimal(value)
  if (!normalized) return 'El peso es obligatorio'
  const kg = Number(normalized)
  if (Number.isNaN(kg)) return 'El peso debe ser un número'
  if (kg < WEIGHT_MIN_KG || kg > WEIGHT_MAX_KG)
    return `El peso debe estar entre ${WEIGHT_MIN_KG} y ${WEIGHT_MAX_KG} kg`
  if (!WEIGHT_PATTERN.test(normalized))
    return 'El peso admite hasta 3 enteros y 2 decimales'
  return undefined
}

// se envía recortado: se cuenta lo que llega al backend
export const validateWeightComment = ({ value }: FieldValue) =>
  value.trim().length > COMMENT_MAX_LENGTH
    ? `El comentario no puede superar los ${COMMENT_MAX_LENGTH} caracteres`
    : undefined
