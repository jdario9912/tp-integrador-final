import { beforeEach, describe, expect, it, vi } from 'vitest'
import { put } from '../api'
import { trainingSession } from '../../test/training-session-fixtures'
import { putPerformedSet } from './put-performed-set'

vi.mock('../api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../api')>()),
  put: vi.fn(),
}))

const ATHLETE_ID = '0a6d2b9e-7c51-4c1e-9d3f-2b8e5f6a7c10'
const SESSION_ID = '4f5a6b7c-8d9e-4f0a-8b1c-2d3e4f5a6b7c'
const EXERCISE_ID = 'e1f2a3b4-c5d6-4e7f-8a9b-0c1d2e3f4a5b'

beforeEach(() => {
  vi.mocked(put).mockReset()
})

describe('putPerformedSet', () => {
  it('hace PUT a la URL de la serie con el cuerpo y devuelve la sesión', async () => {
    const session = trainingSession()
    vi.mocked(put).mockResolvedValue(session)
    const body = { status: 'DONE', weight: 62.5, reps: 8, rpe: 8 } as const

    await expect(
      putPerformedSet(
        {
          athleteId: ATHLETE_ID,
          sessionId: SESSION_ID,
          routineExerciseId: EXERCISE_ID,
          setNumber: 2,
        },
        body,
      ),
    ).resolves.toBe(session)
    expect(put).toHaveBeenCalledWith(
      `/athletes/${ATHLETE_ID}/sessions/${SESSION_ID}/exercises/${EXERCISE_ID}/sets/2`,
      body,
    )
  })

  it('una serie omitida envía el motivo', async () => {
    vi.mocked(put).mockResolvedValue(trainingSession())
    const body = { status: 'SKIPPED', skipReason: 'Dolor de hombro' } as const

    await putPerformedSet(
      {
        athleteId: ATHLETE_ID,
        sessionId: SESSION_ID,
        routineExerciseId: EXERCISE_ID,
        setNumber: 1,
      },
      body,
    )

    expect(put).toHaveBeenCalledWith(expect.any(String), body)
  })
})
