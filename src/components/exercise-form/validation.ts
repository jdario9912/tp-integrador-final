// validadores espejo del backend (POST/PUT /exercises)
type FieldValue = { value: string }

export const EXERCISE_NAME_MAX_LENGTH = 100
export const DESCRIPTION_MAX_LENGTH = 500
export const VIDEO_URL_MAX_LENGTH = 500

export const validateExerciseName = ({ value }: FieldValue) => {
  const trimmed = value.trim()
  if (!trimmed) return 'El nombre es obligatorio'
  if (trimmed.length > EXERCISE_NAME_MAX_LENGTH)
    return `El nombre admite hasta ${EXERCISE_NAME_MAX_LENGTH} caracteres`
  return undefined
}

export const validateMuscleGroup = ({ value }: FieldValue) =>
  value ? undefined : 'El grupo muscular es obligatorio'

export const validateDescription = ({ value }: FieldValue) =>
  value.trim().length > DESCRIPTION_MAX_LENGTH
    ? `La descripción admite hasta ${DESCRIPTION_MAX_LENGTH} caracteres`
    : undefined

// el backend solo acepta links http o https (nada de javascript: ni mailto:)
const isHttpUrl = (value: string) => {
  try {
    const { protocol } = new URL(value)
    return protocol === 'http:' || protocol === 'https:'
  } catch {
    return false
  }
}

export const validateVideoUrl = ({ value }: FieldValue) => {
  const trimmed = value.trim()
  if (!trimmed) return undefined
  if (trimmed.length > VIDEO_URL_MAX_LENGTH)
    return `El link admite hasta ${VIDEO_URL_MAX_LENGTH} caracteres`
  if (!isHttpUrl(trimmed))
    return 'Ingresá un link válido que empiece con http:// o https://'
  return undefined
}
