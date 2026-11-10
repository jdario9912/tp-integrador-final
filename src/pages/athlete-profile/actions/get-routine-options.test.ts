import { beforeEach, describe, expect, it, vi } from 'vitest'
import { get } from '../../../lib/api'
import { routinesPage } from '../../../test/routine-fixtures'
import { getRoutineOptions } from './get-routine-options'

vi.mock('../../../lib/api', () => ({ get: vi.fn() }))

beforeEach(() => {
  vi.mocked(get).mockReset()
})

describe('getRoutineOptions', () => {
  it('pide GET /routines con una página de 100', async () => {
    const page = routinesPage()
    vi.mocked(get).mockResolvedValue(page)

    await expect(getRoutineOptions()).resolves.toBe(page)
    expect(get).toHaveBeenCalledWith('/routines', { params: { size: 100 } })
  })
})
