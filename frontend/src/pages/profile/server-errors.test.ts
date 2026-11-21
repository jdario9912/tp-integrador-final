import { describe, expect, it, vi } from 'vitest'
import { ApiError } from '../../lib/api'
import { PROFILE_UNEXPECTED_ERROR } from './messages'
import { distributeServerErrors } from './server-errors'

const names = ['firstName', 'email'] as const

describe('distributeServerErrors (US-48)', () => {
  it('un 400 con campos conocidos va a cada campo y no deja aviso general', () => {
    const setFieldError = vi.fn()
    const error = new ApiError('Datos inválidos', 400, {
      fieldErrors: [
        { field: 'firstName', message: 'El nombre es obligatorio' },
      ],
    })

    const general = distributeServerErrors(error, names, setFieldError)

    expect(setFieldError).toHaveBeenCalledWith(
      'firstName',
      'El nombre es obligatorio',
    )
    expect(general).toBeUndefined()
  })

  it('un campo que no está en el formulario se muestra como aviso general', () => {
    const setFieldError = vi.fn()
    const error = new ApiError('Datos inválidos', 400, {
      fieldErrors: [{ field: 'otro', message: 'Algo más' }],
    })

    expect(distributeServerErrors(error, names, setFieldError)).toBe(
      'Datos inválidos',
    )
    expect(setFieldError).not.toHaveBeenCalled()
  })

  it('un error sin campos (por ejemplo 503) va al aviso general con su mensaje', () => {
    const error = new ApiError('El almacenamiento no está disponible', 503)

    expect(distributeServerErrors(error, names, vi.fn())).toBe(
      'El almacenamiento no está disponible',
    )
  })

  it('un error que no es de la API cae al mensaje genérico', () => {
    expect(distributeServerErrors(new Error('boom'), names, vi.fn())).toBe(
      PROFILE_UNEXPECTED_ERROR,
    )
  })
})
