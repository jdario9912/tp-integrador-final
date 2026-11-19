// validadores de campos de formulario (TanStack Form) compartidos entre páginas
type FieldValue = { value: string }

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export const validateRequired =
  (message: string) =>
  ({ value }: FieldValue) =>
    value.trim() ? undefined : message

export const validateEmail = ({ value }: FieldValue) => {
  if (!value.trim()) return 'El email es obligatorio'
  if (!EMAIL_PATTERN.test(value.trim())) return 'El email no es válido'
  return undefined
}

const PASSWORD_MIN_LENGTH = 8
// el backend guarda la contraseña con BCrypt, que solo usa los primeros 72 bytes: se mide en
// bytes UTF-8 (una letra con tilde ocupa 2) y no en caracteres
const PASSWORD_MAX_BYTES = 72

const byteLength = (value: string) => new TextEncoder().encode(value).length

export const validatePassword = ({ value }: FieldValue) => {
  if (!value) return 'La contraseña es obligatoria'
  if (value.length < PASSWORD_MIN_LENGTH)
    return `La contraseña debe tener al menos ${PASSWORD_MIN_LENGTH} caracteres`
  if (byteLength(value) > PASSWORD_MAX_BYTES)
    return 'La contraseña es demasiado larga'
  return undefined
}
