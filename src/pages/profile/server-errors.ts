import { isApiError } from '../../lib/api'
import { PROFILE_UNEXPECTED_ERROR } from './messages'

// reparte los errores del backend: los de un campo conocido van a ese campo (con setFieldError) y
// el resto, o un error sin campos, se devuelve como aviso general del formulario
export const distributeServerErrors = <TName extends string>(
  error: unknown,
  fieldNames: readonly TName[],
  setFieldError: (name: TName, message: string) => void,
): string | undefined => {
  if (!isApiError(error)) return PROFILE_UNEXPECTED_ERROR
  const known = error.fieldErrors.filter(({ field }) =>
    fieldNames.some((name) => name === field),
  )
  known.forEach(({ field, message }) => setFieldError(field as TName, message))
  const hasUnmapped = known.length < error.fieldErrors.length
  if (known.length === 0 || hasUnmapped) {
    return error.message || PROFILE_UNEXPECTED_ERROR
  }
  return undefined
}
