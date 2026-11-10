import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError, get, post, put } from '../api'
import { weightRecord, weightsPage } from '../../test/weight-fixtures'
import { createWeight } from './create-weight'
import { getWeights } from './get-weights'
import { updateWeight } from './update-weight'

vi.mock('../api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../api')>()),
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
}))

const ATHLETE_ID = '3f1c2a9e-8b7d-4c1e-9a2b-5d6e7f8a9b0c'
const input = { date: '2026-11-06', weightKg: 72.5, comment: 'En ayunas' }

beforeEach(() => {
  vi.mocked(get).mockReset()
  vi.mocked(post).mockReset()
  vi.mocked(put).mockReset()
})

describe('acciones de los registros de peso', () => {
  it('getWeights pide GET /athletes/{athleteId}/weights con los query params', async () => {
    const page = weightsPage()
    vi.mocked(get).mockResolvedValue(page)

    await expect(
      getWeights(ATHLETE_ID, { from: '2026-11-06', to: '2026-11-06', size: 1 }),
    ).resolves.toBe(page)
    expect(get).toHaveBeenCalledWith(`/athletes/${ATHLETE_ID}/weights`, {
      params: { from: '2026-11-06', to: '2026-11-06', size: 1 },
    })
  })

  it('getWeights sin query no manda filtros', async () => {
    vi.mocked(get).mockResolvedValue(weightsPage([]))

    await getWeights(ATHLETE_ID)
    expect(get).toHaveBeenCalledWith(`/athletes/${ATHLETE_ID}/weights`, {
      params: {},
    })
  })

  it('createWeight envía el body a POST /athletes/{athleteId}/weights', async () => {
    const record = weightRecord()
    vi.mocked(post).mockResolvedValue(record)

    await expect(createWeight(ATHLETE_ID, input)).resolves.toBe(record)
    expect(post).toHaveBeenCalledWith(`/athletes/${ATHLETE_ID}/weights`, input)
  })

  it('updateWeight envía el body a PUT /athletes/{athleteId}/weights/{weightId}', async () => {
    const record = weightRecord()
    vi.mocked(put).mockResolvedValue(record)

    await expect(updateWeight(ATHLETE_ID, record.id, input)).resolves.toBe(
      record,
    )
    expect(put).toHaveBeenCalledWith(
      `/athletes/${ATHLETE_ID}/weights/${record.id}`,
      input,
    )
  })

  it('propagan el ApiError (por ejemplo, el 409 del día ocupado)', async () => {
    const error = new ApiError(
      'Ya existe un registro de peso para el 06/11/2026',
      409,
    )
    vi.mocked(post).mockRejectedValue(error)

    await expect(createWeight(ATHLETE_ID, input)).rejects.toBe(error)
  })
})
