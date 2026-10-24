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
