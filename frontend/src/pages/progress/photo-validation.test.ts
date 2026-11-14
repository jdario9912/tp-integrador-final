import { describe, expect, it } from 'vitest'
import { isApiError, ApiError } from '../../lib/api'
import {
  PHOTO_LIST_UNAVAILABLE,
  PHOTO_UNEXPECTED_ERROR,
  photoErrorMessage,
} from './photo-messages'
import { validatePhotoTakenOn } from './photo-validation'

describe('validatePhotoTakenOn', () => {
  const TODAY = '2026-11-06'

  it('acepta hoy y días pasados', () => {
    expect(validatePhotoTakenOn(TODAY, TODAY)).toBe(undefined)
    expect(validatePhotoTakenOn('2026-10-01', TODAY)).toBe(undefined)
  })

  it('no acepta una fecha futura', () => {
    expect(validatePhotoTakenOn('2026-11-07', TODAY)).toBe(
      'La fecha no puede ser futura',
    )
  })

  it('una fecha vacía es válida: el backend usa hoy', () => {
    expect(validatePhotoTakenOn('', TODAY)).toBe(undefined)
  })
})

describe('photoErrorMessage', () => {
  const texts = {
    unavailable: PHOTO_LIST_UNAVAILABLE,
    fallback: PHOTO_UNEXPECTED_ERROR,
  }

  it('un 503 muestra el texto de servicio no disponible', () => {
    expect(
      photoErrorMessage(
        new ApiError('El servicio de almacenamiento no está disponible', 503),
        texts,
      ),
    ).toBe(PHOTO_LIST_UNAVAILABLE)
  })

  it('un error de API con texto muestra el mensaje del backend', () => {
    expect(
      photoErrorMessage(
        new ApiError(
          'Formato no permitido. Subí una foto en JPG, PNG o WebP',
          415,
        ),
        texts,
      ),
    ).toBe('Formato no permitido. Subí una foto en JPG, PNG o WebP')
  })

  it('un error que no es de API usa el genérico', () => {
    expect(photoErrorMessage(new TypeError('boom'), texts)).toBe(
      PHOTO_UNEXPECTED_ERROR,
    )
    expect(isApiError(new TypeError('boom'))).toBe(false)
  })
})
