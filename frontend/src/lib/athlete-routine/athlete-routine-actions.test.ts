import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError, getOptional } from '../api'
import { athleteRoutine } from '../../test/athlete-routine-fixtures'
import { getAthleteRoutine } from './get-athlete-routine'

vi.mock('../api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../api')>()),
  getOptional: vi.fn(),
}))

const ATHLETE_ID = '0a6d2b9e-7c51-4c1e-9d3f-2b8e5f6a7c10'

beforeEach(() => {
  vi.mocked(getOptional).mockReset()
})

describe('getAthleteRoutine', () => {
  it('pide GET /athletes/{athleteId}/routine y devuelve la rutina activa', async () => {
    const routine = athleteRoutine()
    vi.mocked(getOptional).mockResolvedValue(routine)

    await expect(getAthleteRoutine(ATHLETE_ID)).resolves.toBe(routine)
    expect(getOptional).toHaveBeenCalledWith(`/athletes/${ATHLETE_ID}/routine`)
  })

  it('sin rutina activa (204) devuelve null', async () => {
    vi.mocked(getOptional).mockResolvedValue(null)

    await expect(getAthleteRoutine(ATHLETE_ID)).resolves.toBeNull()
  })

  it('propaga el ApiError', async () => {
    const error = new ApiError(
      'No tiene permisos para acceder a este atleta',
      403,
    )
    vi.mocked(getOptional).mockRejectedValue(error)

    await expect(getAthleteRoutine(ATHLETE_ID)).rejects.toBe(error)
  })
})
