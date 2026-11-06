// validadores espejo del backend (POST /routines)
type FieldValue = { value: string }

export const ROUTINE_NAME_MAX_LENGTH = 100
export const GOAL_MAX_LENGTH = 100
export const DESCRIPTION_MAX_LENGTH = 500
export const DAYS_PER_WEEK_MAX = 7
export const DURATION_WEEKS_MAX = 52

export const validateRoutineName = ({ value }: FieldValue) => {
  const trimmed = value.trim()
  if (!trimmed) return 'El nombre es obligatorio'
  if (trimmed.length > ROUTINE_NAME_MAX_LENGTH)
    return `El nombre admite hasta ${ROUTINE_NAME_MAX_LENGTH} caracteres`
  return undefined
}

export const validateGoal = ({ value }: FieldValue) =>
  value.trim().length > GOAL_MAX_LENGTH
    ? `El objetivo admite hasta ${GOAL_MAX_LENGTH} caracteres`
    : undefined

export const validateDescription = ({ value }: FieldValue) =>
  value.trim().length > DESCRIPTION_MAX_LENGTH
    ? `La descripción admite hasta ${DESCRIPTION_MAX_LENGTH} caracteres`
    : undefined

// opcional: vacío vale; si hay algo tiene que ser un entero entre 1 y max
const isIntegerBetween = (value: string, max: number) => {
  const number = Number(value)
  return Number.isInteger(number) && number >= 1 && number <= max
}

export const validateDaysPerWeek = ({ value }: FieldValue) => {
  const trimmed = value.trim()
  if (!trimmed || isIntegerBetween(trimmed, DAYS_PER_WEEK_MAX)) return undefined
  return `Los días por semana deben estar entre 1 y ${DAYS_PER_WEEK_MAX}`
}

export const validateDurationWeeks = ({ value }: FieldValue) => {
  const trimmed = value.trim()
  if (!trimmed || isIntegerBetween(trimmed, DURATION_WEEKS_MAX))
    return undefined
  return `La duración debe estar entre 1 y ${DURATION_WEEKS_MAX} semanas`
}
