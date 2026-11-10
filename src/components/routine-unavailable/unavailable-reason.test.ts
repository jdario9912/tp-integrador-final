import { describe, expect, it } from 'vitest'
import { ApiError } from '../../lib/api'
import { unavailableReason } from './unavailable-reason'

describe('unavailableReason', () => {
  it.each([
    [403, 'forbidden'],
    [404, 'not-found'],
    [400, 'not-found'],
  ])('un %i no se puede reintentar (%s)', (status, reason) => {
    expect(unavailableReason(new ApiError('error', status))).toBe(reason)
  })

  it.each([0, 500])('un %i se puede reintentar', (status) => {
    expect(unavailableReason(new ApiError('error', status))).toBeUndefined()
  })

  it('un error inesperado se puede reintentar', () => {
    expect(unavailableReason(new Error('boom'))).toBeUndefined()
  })
})
