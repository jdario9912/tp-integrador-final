// validadores propios del registro; los compartidos están en lib/validation
type FieldValue = { value: string }

const PASSWORD_MIN_LENGTH = 8

export const validatePassword = ({ value }: FieldValue) => {
  if (!value) return 'La contraseña es obligatoria'
  if (value.length < PASSWORD_MIN_LENGTH)
    return `La contraseña debe tener al menos ${PASSWORD_MIN_LENGTH} caracteres`
  return undefined
}
