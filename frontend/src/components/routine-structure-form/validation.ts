// validadores espejo del backend (PUT /routines/{id}/days)
type FieldValue = { value: string }

export const MAX_DAYS = 7
export const MAX_EXERCISES_PER_DAY = 30
export const DAY_NAME_MAX_LENGTH = 100
export const SETS_MAX = 99
export const REPS_MAX = 999
export const WEIGHT_MAX = 1000
export const REST_MAX = 3600
export const TECHNIQUE_NOTE_MAX_LENGTH = 500

export const validateDayName = ({ value }: FieldValue) => {
  const trimmed = value.trim()
  if (!trimmed) return 'El nombre del día es obligatorio'
  if (trimmed.length > DAY_NAME_MAX_LENGTH)
    return `El nombre del día admite hasta ${DAY_NAME_MAX_LENGTH} caracteres`
  return undefined
}

const isIntegerBetween = (value: string, min: number, max: number) => {
  const number = Number(value)
  return Number.isInteger(number) && number >= min && number <= max
}

export const validateSets = ({ value }: FieldValue) => {
  const trimmed = value.trim()
  if (!trimmed) return 'Las series son obligatorias'
  if (!isIntegerBetween(trimmed, 1, SETS_MAX))
    return `Las series deben estar entre 1 y ${SETS_MAX}`
  return undefined
}

export const validateReps = ({ value }: FieldValue) => {
  const trimmed = value.trim()
  if (!trimmed) return 'Las repeticiones son obligatorias'
  if (!isIntegerBetween(trimmed, 1, REPS_MAX))
    return `Las repeticiones deben estar entre 1 y ${REPS_MAX}`
  return undefined
}

// numeric(6,2) en el backend: hasta 2 decimales. Se acepta coma decimal
const WEIGHT_PATTERN = /^\d+(?:[.,]\d+)?$/
const WEIGHT_DECIMALS_PATTERN = /^\d+(?:[.,]\d{1,2})?$/

export const validateRecommendedWeight = ({ value }: FieldValue) => {
  const trimmed = value.trim()
  if (!trimmed) return undefined
  const range = `El peso recomendado debe estar entre 0 y ${WEIGHT_MAX} kg`
  if (!WEIGHT_PATTERN.test(trimmed)) return range
  if (Number(trimmed.replace(',', '.')) > WEIGHT_MAX) return range
  if (!WEIGHT_DECIMALS_PATTERN.test(trimmed))
    return 'El peso recomendado admite hasta 2 decimales'
  return undefined
}

export const validateRest = ({ value }: FieldValue) => {
  const trimmed = value.trim()
  if (!trimmed || isIntegerBetween(trimmed, 0, REST_MAX)) return undefined
  return `El descanso debe estar entre 0 y ${REST_MAX} segundos`
}

// igual que el backend: sin distinguir mayúsculas y con el espacio opcional ("rpe8.5")
const RIR_RPE_PATTERN = /^(RIR|RPE)\s*(\d{1,2}(?:[.,]5)?)$/i

// "RIR n" (entero de 0 a 10) o "RPE n" (de 1 a 10, admite .5); undefined si no es válido
export const parseRirRpe = (value: string) => {
  const match = RIR_RPE_PATTERN.exec(value.trim())
  if (!match) return undefined
  const scale = match[1].toUpperCase() as 'RIR' | 'RPE'
  const number = Number(match[2].replace(',', '.'))
  const isValid =
    scale === 'RIR'
      ? Number.isInteger(number) && number <= 10
      : number >= 1 && number <= 10
  return isValid ? { scale, number } : undefined
}

export const validateRirRpe = ({ value }: FieldValue) => {
  if (!value.trim() || parseRirRpe(value)) return undefined
  return 'Usá el formato RIR n (0 a 10) o RPE n (1 a 10)'
}

export const validateTechniqueNote = ({ value }: FieldValue) =>
  value.trim().length > TECHNIQUE_NOTE_MAX_LENGTH
    ? `La nota técnica admite hasta ${TECHNIQUE_NOTE_MAX_LENGTH} caracteres`
    : undefined
