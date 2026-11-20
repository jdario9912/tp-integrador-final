import { normalizeDecimal } from '../../lib/decimal'
import type { MeasurementField } from './body-measurement-fields'

// fecha y comentario: mismas reglas y mensajes que el peso (contrato 17.4)
export {
  validateWeightComment as validateBodyMeasurementComment,
  validateWeightDate as validateBodyMeasurementDate,
} from './validation'

// hasta 3 enteros y 2 decimales, como numeric(5,2) en la base (contrato 17.4)
const VALUE_PATTERN = /^\d{1,3}(\.\d{1,2})?$/

// espejo de las reglas del backend para un valor de medida. Vacío es válido: significa "no se mide"
export const validateMeasurementValue = (
  raw: string,
  field: Pick<MeasurementField, 'min' | 'max'>,
) => {
  const normalized = normalizeDecimal(raw)
  if (normalized === '') return undefined
  const value = Number(normalized)
  if (Number.isNaN(value)) return 'El valor debe ser un número'
  if (value <= 0) return 'El valor debe ser mayor a 0'
  if (!VALUE_PATTERN.test(normalized))
    return 'El valor admite hasta 3 enteros y 2 decimales'
  if (value < field.min || value > field.max)
    return `El valor debe estar entre ${field.min} y ${field.max}`
  return undefined
}

// al menos una medida con valor: el backend lo exige y el formulario lo avisa antes de enviar
export const hasAnyMeasurement = (values: Record<string, string>) =>
  Object.values(values).some((value) => normalizeDecimal(value) !== '')
