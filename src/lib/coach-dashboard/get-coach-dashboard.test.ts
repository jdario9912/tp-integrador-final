import { beforeEach, describe, expect, it, vi } from 'vitest'
import { get } from '../api'
import { coachDashboard } from '../../test/coach-dashboard-fixtures'
import { getCoachDashboard } from './get-coach-dashboard'

vi.mock('../api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../api')>()),
  get: vi.fn(),
}))

beforeEach(() => {
  vi.mocked(get).mockReset()
})

describe('getCoachDashboard (US-11)', () => {
  it('pide GET /coaches/me/dashboard y devuelve la respuesta tal cual', async () => {
    const dashboard = coachDashboard()
    vi.mocked(get).mockResolvedValue(dashboard)

    await expect(getCoachDashboard()).resolves.toBe(dashboard)
    expect(get).toHaveBeenCalledWith('/coaches/me/dashboard')
  })
})
