import { isApiError } from '../../lib/api'

const UNEXPECTED_ERROR = 'Ocurrió un error inesperado. Intentá nuevamente.'

// mensaje de un error de la alimentación del atleta (US-25). Un 400 trae el motivo en fieldErrors
// (rango inválido o de más de 31 días): se muestra ese, que es más claro que el general
export const nutritionErrorMessage = (error: unknown) => {
  if (!isApiError(error)) return UNEXPECTED_ERROR
  if (error.status === 400 && error.fieldErrors[0])
    return error.fieldErrors[0].message
  return error.message
}

// 400 (el rango) y 403 (atleta de otro entrenador) no cambian al reintentar
export const canRetryNutrition = (error: unknown) =>
  !isApiError(error) || (error.status !== 400 && error.status !== 403)
