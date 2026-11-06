import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError, get } from '../../../lib/api'
import { routinesPage } from '../../../test/routine-fixtures'
import { getRoutines } from './get-routines'

vi.mock('../../../lib/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../lib/api')>()),
  get: vi.fn(),
}))

beforeEach(() => {
  vi.mocked(get).mockReset()
})

describe('getRoutines', () => {
  it('pide GET /routines con la página en base 0 y devuelve la página', async () => {
    const page = routinesPage()
    vi.mocked(get).mockResolvedValue(page)

    await expect(getRoutines({ page: 2 })).resolves.toBe(page)
    expect(get).toHaveBeenCalledWith('/routines', {
      params: { page: 1, size: 20 },
    })
  })

  it('propaga el ApiError', async () => {
    const error = new ApiError('No tiene permisos', 403)
    vi.mocked(get).mockRejectedValue(error)

    await expect(getRoutines({ page: 1 })).rejects.toBe(error)
  })
})
