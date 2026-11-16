// reglas del historial y de la revisión (US-21), espejo del backend (contrato 25)
export const REVIEW_OBSERVATION_MAX_LENGTH = 1000

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

// el rango de fechas: vacío = sin límite. Un "desde" posterior a "hasta" es un error del formulario
// (el backend respondería 400); se muestra antes de consultar
export const validateHistoryRange = (from: string, to: string) => {
  if ((from && !DATE_PATTERN.test(from)) || (to && !DATE_PATTERN.test(to)))
    return 'La fecha no es válida'
  if (from && to && from > to)
    return 'La fecha «Desde» no puede ser posterior a «Hasta»'
  return undefined
}

// la observación se envía recortada; vacía no se manda. Más de 1000 caracteres, después de recortar
export const validateReviewObservation = (value: string) =>
  value.trim().length > REVIEW_OBSERVATION_MAX_LENGTH
    ? `La observación no puede superar los ${REVIEW_OBSERVATION_MAX_LENGTH} caracteres`
    : undefined

export const toObservationInput = (value: string) => value.trim() || undefined
