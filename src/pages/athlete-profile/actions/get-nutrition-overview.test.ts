import { beforeEach, describe, expect, it, vi } from 'vitest'
import { get } from '../../../lib/api'
import { getNutritionOverview } from './get-nutrition-overview'

vi.mock('../../../lib/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../lib/api')>()),
  get: vi.fn(),
}))

const ATHLETE_ID = '3f1c2a9e-8b7d-4c1e-9a2b-5d6e7f8a9b0c'

beforeEach(() => {
  vi.mocked(get).mockReset()
})

describe('getNutritionOverview (US-25)', () => {
  it('pide la alimentación del rango con from y to explícitos', async () => {
    vi.mocked(get).mockResolvedValue({})

    await getNutritionOverview(ATHLETE_ID, {
      from: '2026-11-11',
      to: '2026-11-17',
    })

    expect(get).toHaveBeenCalledWith(`/athletes/${ATHLETE_ID}/meals/overview`, {
      params: { from: '2026-11-11', to: '2026-11-17' },
    })
  })
})
