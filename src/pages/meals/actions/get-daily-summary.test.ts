import { beforeEach, describe, expect, it, vi } from 'vitest'
import { get } from '../../../lib/api'
import { getDailyNutritionSummary } from './get-daily-summary'

vi.mock('../../../lib/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../lib/api')>()),
  get: vi.fn(),
}))

const ATHLETE_ID = '0a6d2b9e-7c51-4c1e-9d3f-2b8e5f6a7c10'

beforeEach(() => {
  vi.mocked(get).mockReset()
})

describe('getDailyNutritionSummary', () => {
  it('pide el resumen del día con la fecha explícita', async () => {
    vi.mocked(get).mockResolvedValue({})

    await getDailyNutritionSummary(ATHLETE_ID, '2026-11-12')

    expect(get).toHaveBeenCalledWith(`/athletes/${ATHLETE_ID}/meals/summary`, {
      params: { date: '2026-11-12' },
    })
  })
})
