type FieldValue = { value: string }

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PASSWORD_MIN_LENGTH = 8

export const validateRequired =
  (message: string) =>
  ({ value }: FieldValue) =>
    value.trim() ? undefined : message

export const validateEmail = ({ value }: FieldValue) => {
  if (!value.trim()) return 'El email es obligatorio'
  if (!EMAIL_PATTERN.test(value.trim())) return 'El email no es válido'
  return undefined
}

export const validatePassword = ({ value }: FieldValue) => {
  if (!value) return 'La contraseña es obligatoria'
  if (value.length < PASSWORD_MIN_LENGTH)
    return `La contraseña debe tener al menos ${PASSWORD_MIN_LENGTH} caracteres`
  return undefined
}
