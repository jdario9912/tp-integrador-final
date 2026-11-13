import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError, get, getOptional, post } from '../api'
import { trainingSession } from '../../test/training-session-fixtures'
import { getInProgressSession } from './get-in-progress-session'
import { getTrainingSession } from './get-training-session'
import { startTrainingSession } from './start-training-session'

vi.mock('../api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../api')>()),
  get: vi.fn(),
  getOptional: vi.fn(),
  post: vi.fn(),
}))

const ATHLETE_ID = '0a6d2b9e-7c51-4c1e-9d3f-2b8e5f6a7c10'
const DAY_ID = 'c3d4e5f6-0718-4293-a4b5-c6d7e8f90a1b'

beforeEach(() => {
  vi.mocked(get).mockReset()
  vi.mocked(getOptional).mockReset()
  vi.mocked(post).mockReset()
})

describe('acciones de las sesiones de entrenamiento', () => {
  it('startTrainingSession envía el día a POST /athletes/{athleteId}/sessions', async () => {
    const session = trainingSession()
    vi.mocked(post).mockResolvedValue(session)

    await expect(
      startTrainingSession(ATHLETE_ID, { routineDayId: DAY_ID }),
    ).resolves.toBe(session)
    expect(post).toHaveBeenCalledWith(`/athletes/${ATHLETE_ID}/sessions`, {
      routineDayId: DAY_ID,
    })
  })

  it('getInProgressSession pide GET /athletes/{athleteId}/sessions/in-progress', async () => {
    const session = trainingSession()
    vi.mocked(getOptional).mockResolvedValue(session)

    await expect(getInProgressSession(ATHLETE_ID)).resolves.toBe(session)
    expect(getOptional).toHaveBeenCalledWith(
      `/athletes/${ATHLETE_ID}/sessions/in-progress`,
    )
  })

  it('getInProgressSession sin sesión en progreso (204) devuelve null', async () => {
    vi.mocked(getOptional).mockResolvedValue(null)

    await expect(getInProgressSession(ATHLETE_ID)).resolves.toBeNull()
  })

  it('getTrainingSession pide GET /athletes/{athleteId}/sessions/{sessionId}', async () => {
    const session = trainingSession()
    vi.mocked(get).mockResolvedValue(session)

    await expect(getTrainingSession(ATHLETE_ID, session.id)).resolves.toBe(
      session,
    )
    expect(get).toHaveBeenCalledWith(
      `/athletes/${ATHLETE_ID}/sessions/${session.id}`,
    )
  })

  it('propagan el ApiError (el 409 de la sesión ya iniciada, el 404 del detalle)', async () => {
    const conflict = new ApiError(
      'Ya tenés un entrenamiento en curso. Retomalo para continuar',
      409,
    )
    const notFound = new ApiError(
      'No existe la sesión de entrenamiento con id x',
      404,
    )
    vi.mocked(post).mockRejectedValue(conflict)
    vi.mocked(get).mockRejectedValue(notFound)

    await expect(
      startTrainingSession(ATHLETE_ID, { routineDayId: DAY_ID }),
    ).rejects.toBe(conflict)
    await expect(getTrainingSession(ATHLETE_ID, 'x')).rejects.toBe(notFound)
  })
})
