// validadores propios del alta de atleta; los compartidos están en lib/validation.
// Todos aceptan el campo vacío porque son datos opcionales
type FieldValue = { value: string }

// numeric(5,2) en la base: hasta 3 enteros y 2 decimales
const MEASURE_PATTERN = /^\d{1,3}(\.\d{1,2})?$/

export const validateMeasure =
  (label: string) =>
  ({ value }: FieldValue) => {
    const trimmed = value.trim()
    if (!trimmed) return undefined
    if (Number.isNaN(Number(trimmed)) || Number(trimmed) <= 0)
      return `${label} debe ser mayor a 0`
    if (!MEASURE_PATTERN.test(trimmed))
      return `${label} admite hasta 3 enteros y 2 decimales`
    return undefined
  }

export const validateAvailableDays = ({ value }: FieldValue) => {
  const trimmed = value.trim()
  if (!trimmed) return undefined
  const days = Number(trimmed)
  if (!Number.isInteger(days) || days < 1 || days > 7)
    return 'Los días disponibles deben estar entre 1 y 7'
  return undefined
}

// fecha local de hoy en YYYY-MM-DD, el mismo formato que devuelve <input type="date">
export const todayIsoDate = () => {
  const now = new Date()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${now.getFullYear()}-${month}-${day}`
}

export const validatePastDate = ({ value }: FieldValue) => {
  if (!value) return undefined
  // las fechas ISO se comparan bien como strings
  if (value >= todayIsoDate())
    return 'La fecha de nacimiento debe ser anterior a hoy'
  return undefined
}
