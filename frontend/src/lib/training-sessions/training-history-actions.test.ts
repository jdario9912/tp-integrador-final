import { beforeEach, describe, expect, it, vi } from 'vitest'
import { get, put } from '../api'
import {
  trainingHistoryItem,
  trainingSession,
} from '../../test/training-session-fixtures'
import { getTrainingHistory } from './get-training-history'
import { putSessionReview } from './put-session-review'

vi.mock('../api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../api')>()),
  get: vi.fn(),
  put: vi.fn(),
}))

const ATHLETE_ID = '0a6d2b9e-7c51-4c1e-9d3f-2b8e5f6a7c10'
const SESSION_ID = '4f5a6b7c-8d9e-4f0a-8b1c-2d3e4f5a6b7c'

beforeEach(() => {
  vi.mocked(get).mockReset()
  vi.mocked(put).mockReset()
})

describe('historial y revisión (US-21)', () => {
  it('getTrainingHistory pide la página con los filtros como query params', async () => {
    const page = {
      content: [trainingHistoryItem()],
      page: 1,
      size: 10,
      totalElements: 11,
      totalPages: 2,
    }
    vi.mocked(get).mockResolvedValue(page)

    await expect(
      getTrainingHistory(ATHLETE_ID, {
        from: '2026-11-01',
        to: '2026-11-30',
        page: 1,
        size: 10,
      }),
    ).resolves.toBe(page)
    expect(get).toHaveBeenCalledWith(`/athletes/${ATHLETE_ID}/sessions`, {
      params: { from: '2026-11-01', to: '2026-11-30', page: 1, size: 10 },
    })
  })

  it('getTrainingHistory sin filtros no manda fechas', async () => {
    vi.mocked(get).mockResolvedValue({ content: [] })

    await getTrainingHistory(ATHLETE_ID)

    expect(get).toHaveBeenCalledWith(`/athletes/${ATHLETE_ID}/sessions`, {
      params: {},
    })
  })

  it('putSessionReview hace PUT a .../review con la observación', async () => {
    const session = trainingSession({ status: 'FINISHED' })
    vi.mocked(put).mockResolvedValue(session)

    await expect(
      putSessionReview(ATHLETE_ID, SESSION_ID, { observation: 'Buen trabajo' }),
    ).resolves.toBe(session)
    expect(put).toHaveBeenCalledWith(
      `/athletes/${ATHLETE_ID}/sessions/${SESSION_ID}/review`,
      { observation: 'Buen trabajo' },
    )
  })

  it('putSessionReview sin observación manda el body vacío', async () => {
    vi.mocked(put).mockResolvedValue(trainingSession())

    await putSessionReview(ATHLETE_ID, SESSION_ID, {})

    expect(put).toHaveBeenCalledWith(expect.any(String), {})
  })
})
