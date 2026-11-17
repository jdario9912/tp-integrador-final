import { describe, expect, it } from 'vitest'
import { ApiError } from '../../lib/api'
import { canRetryNutrition, nutritionErrorMessage } from './nutrition-error'

describe('errores de la alimentación del atleta (US-25)', () => {
  it('un 400 muestra el motivo del campo y no se reintenta', () => {
    const error = new ApiError('Datos inválidos', 400, {
      fieldErrors: [
        { field: 'to', message: 'El rango no puede superar los 31 días' },
      ],
    })

    expect(nutritionErrorMessage(error)).toBe(
      'El rango no puede superar los 31 días',
    )
    expect(canRetryNutrition(error)).toBe(false)
  })

  it('un 403 muestra el mensaje del backend y no se reintenta', () => {
    const error = new ApiError('No podés acceder a este atleta', 403)

    expect(nutritionErrorMessage(error)).toBe('No podés acceder a este atleta')
    expect(canRetryNutrition(error)).toBe(false)
  })

  it('un error de red o inesperado se puede reintentar', () => {
    expect(canRetryNutrition(new ApiError('Sin conexión', 0))).toBe(true)
    expect(nutritionErrorMessage(new Error('x'))).toBe(
      'Ocurrió un error inesperado. Intentá nuevamente.',
    )
  })
})
