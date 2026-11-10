import { beforeEach, describe, expect, it, vi } from 'vitest'
import { get } from '../../../lib/api'
import { athletesPage } from '../../../test/athlete-fixtures'
import { getAthleteOptions } from './get-athlete-options'

vi.mock('../../../lib/api', () => ({ get: vi.fn() }))

beforeEach(() => {
  vi.mocked(get).mockReset()
})

describe('getAthleteOptions', () => {
  it('pide GET /athletes con una página de 100', async () => {
    const page = athletesPage()
    vi.mocked(get).mockResolvedValue(page)

    await expect(getAthleteOptions()).resolves.toBe(page)
    expect(get).toHaveBeenCalledWith('/athletes', { params: { size: 100 } })
  })
})
