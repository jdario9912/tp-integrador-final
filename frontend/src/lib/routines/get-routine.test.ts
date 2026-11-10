import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError, get } from '../api'
import { routineDetail } from '../../test/routine-fixtures'
import { getRoutine } from './get-routine'

vi.mock('../api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../api')>()),
  get: vi.fn(),
}))

beforeEach(() => {
  vi.mocked(get).mockReset()
})

describe('getRoutine', () => {
  it('pide GET /routines/{id} con los días', async () => {
    const routine = routineDetail()
    vi.mocked(get).mockResolvedValue(routine)

    await expect(getRoutine('abc')).resolves.toBe(routine)
    expect(get).toHaveBeenCalledWith('/routines/abc')
  })

  it('propaga el ApiError', async () => {
    const error = new ApiError(
      'No tiene permisos para acceder a esta rutina',
      403,
    )
    vi.mocked(get).mockRejectedValue(error)

    await expect(getRoutine('abc')).rejects.toBe(error)
  })
})
