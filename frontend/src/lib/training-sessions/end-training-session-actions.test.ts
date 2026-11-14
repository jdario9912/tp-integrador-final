import { QueryClient } from '@tanstack/react-query'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { post } from '../api'
import { trainingSession } from '../../test/training-session-fixtures'
import { cancelTrainingSession } from './cancel-training-session'
import { finishTrainingSession } from './finish-training-session'
import { storeEndedSession } from './store-ended-session'
import {
  inProgressSessionKey,
  trainingSessionKey,
} from './training-session-keys'
import type { TrainingSession } from './types'

vi.mock('../api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../api')>()),
  post: vi.fn(),
}))

const ATHLETE_ID = '0a6d2b9e-7c51-4c1e-9d3f-2b8e5f6a7c10'
const USER_ID = ATHLETE_ID
const SESSION_ID = '4f5a6b7c-8d9e-4f0a-8b1c-2d3e4f5a6b7c'

beforeEach(() => {
  vi.mocked(post).mockReset()
})

describe('finalizar y cancelar (US-20)', () => {
  it('finishTrainingSession hace POST sin body a .../finish', async () => {
    const finished = trainingSession({ status: 'FINISHED' })
    vi.mocked(post).mockResolvedValue(finished)

    await expect(finishTrainingSession(ATHLETE_ID, SESSION_ID)).resolves.toBe(
      finished,
    )
    expect(post).toHaveBeenCalledWith(
      `/athletes/${ATHLETE_ID}/sessions/${SESSION_ID}/finish`,
      undefined,
    )
  })

  it('cancelTrainingSession hace POST sin body a .../cancel', async () => {
    const cancelled = trainingSession({ status: 'CANCELLED' })
    vi.mocked(post).mockResolvedValue(cancelled)

    await expect(cancelTrainingSession(ATHLETE_ID, SESSION_ID)).resolves.toBe(
      cancelled,
    )
    expect(post).toHaveBeenCalledWith(
      `/athletes/${ATHLETE_ID}/sessions/${SESSION_ID}/cancel`,
      undefined,
    )
  })
})

describe('storeEndedSession', () => {
  const setup = (inProgress: TrainingSession | null | undefined) => {
    const client = new QueryClient()
    if (inProgress !== undefined) {
      client.setQueryData(inProgressSessionKey(USER_ID, ATHLETE_ID), inProgress)
    }
    return client
  }

  it('reemplaza el detalle y saca la sesión de «en progreso»', () => {
    const current = trainingSession()
    const ended = trainingSession({
      status: 'FINISHED',
      endedAt: '2026-11-11T23:05:00Z',
    })
    const client = setup(current)

    storeEndedSession(client, USER_ID, ATHLETE_ID, ended)

    expect(
      client.getQueryData(trainingSessionKey(USER_ID, ATHLETE_ID, ended.id)),
    ).toBe(ended)
    expect(
      client.getQueryData(inProgressSessionKey(USER_ID, ATHLETE_ID)),
    ).toBeNull()
  })

  it('no toca «en progreso» si la sesión cerrada es otra', () => {
    const other = trainingSession({ id: 'otra-sesion' })
    const ended = trainingSession({ status: 'CANCELLED' })
    const client = setup(other)

    storeEndedSession(client, USER_ID, ATHLETE_ID, ended)

    expect(client.getQueryData(inProgressSessionKey(USER_ID, ATHLETE_ID))).toBe(
      other,
    )
  })

  it('sin caché de «en progreso» solo guarda el detalle', () => {
    const ended = trainingSession({ status: 'FINISHED' })
    const client = setup(undefined)

    storeEndedSession(client, USER_ID, ATHLETE_ID, ended)

    expect(
      client.getQueryData(inProgressSessionKey(USER_ID, ATHLETE_ID)),
    ).toBeUndefined()
    expect(
      client.getQueryData(trainingSessionKey(USER_ID, ATHLETE_ID, ended.id)),
    ).toBe(ended)
  })
})
