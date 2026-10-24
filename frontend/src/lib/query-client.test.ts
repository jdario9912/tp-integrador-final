import { describe, expect, it } from 'vitest'
import { ApiError } from './api'
import { shouldRetryQuery } from './query-client'

describe('shouldRetryQuery', () => {
  it.each([400, 401, 403, 404, 409, 422])(
    'no reintenta un %i: el resultado sería el mismo',
    (status) => {
      expect(shouldRetryQuery(0, new ApiError('Error', status))).toBe(false)
    },
  )

  it.each([0, 500, 503])('reintenta una sola vez un %i', (status) => {
    const error = new ApiError('Error', status)

    expect(shouldRetryQuery(0, error)).toBe(true)
    expect(shouldRetryQuery(1, error)).toBe(false)
  })

  it('reintenta una vez los errores que no vienen de la API', () => {
    expect(shouldRetryQuery(0, new Error('inesperado'))).toBe(true)
    expect(shouldRetryQuery(1, new Error('inesperado'))).toBe(false)
  })
})
