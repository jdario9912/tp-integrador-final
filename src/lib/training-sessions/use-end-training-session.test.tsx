import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../api'
import { saveSession } from '../auth'
import { session } from '../../test/auth-fixtures'
import { trainingSession } from '../../test/training-session-fixtures'
import { cancelTrainingSession } from './cancel-training-session'
import { finishTrainingSession } from './finish-training-session'
import {
  inProgressSessionKey,
  trainingSessionKey,
} from './training-session-keys'
import {
  useCancelTrainingSession,
  useFinishTrainingSession,
} from './use-end-training-session'

vi.mock('./finish-training-session', () => ({
  finishTrainingSession: vi.fn(),
}))
vi.mock('./cancel-training-session', () => ({
  cancelTrainingSession: vi.fn(),
}))

const ATHLETE_ID = session('ATHLETE').user.id
const USER_ID = session('ATHLETE').user.id

const setup = <T,>(useHook: () => T) => {
  const client = new QueryClient({
    defaultOptions: { mutations: { retry: false } },
  })
  const invalidate = vi.spyOn(client, 'invalidateQueries')
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  )
  const { result } = renderHook(useHook, { wrapper })
  return { client, result, invalidate }
}

beforeEach(() => {
  vi.mocked(finishTrainingSession).mockReset()
  vi.mocked(cancelTrainingSession).mockReset()
  saveSession(session('ATHLETE'))
})

describe('useFinishTrainingSession', () => {
  it('finaliza y actualiza el detalle y la sesión en progreso', async () => {
    const current = trainingSession()
    const finished = trainingSession({
      status: 'FINISHED',
      endedAt: '2026-11-11T23:05:00Z',
    })
    vi.mocked(finishTrainingSession).mockResolvedValue(finished)
    const { client, result, invalidate } = setup(() =>
      useFinishTrainingSession(ATHLETE_ID, current.id),
    )
    client.setQueryData(inProgressSessionKey(USER_ID, ATHLETE_ID), current)

    await act(async () => {
      await result.current.mutateAsync()
    })

    expect(finishTrainingSession).toHaveBeenCalledWith(ATHLETE_ID, current.id)
    expect(
      client.getQueryData(trainingSessionKey(USER_ID, ATHLETE_ID, current.id)),
    ).toBe(finished)
    expect(
      client.getQueryData(inProgressSessionKey(USER_ID, ATHLETE_ID)),
    ).toBeNull()
    expect(invalidate).not.toHaveBeenCalled()
  })

  it('ante un 409 vuelve a pedir el detalle y la sesión en progreso', async () => {
    vi.mocked(finishTrainingSession).mockRejectedValue(
      new ApiError('Ya no podés cargar ni corregir series', 409),
    )
    const current = trainingSession()
    const { result, invalidate } = setup(() =>
      useFinishTrainingSession(ATHLETE_ID, current.id),
    )

    await act(async () => {
      await expect(result.current.mutateAsync()).rejects.toThrow()
    })

    expect(invalidate).toHaveBeenCalledWith({
      queryKey: trainingSessionKey(USER_ID, ATHLETE_ID, current.id),
    })
    expect(invalidate).toHaveBeenCalledWith({
      queryKey: inProgressSessionKey(USER_ID, ATHLETE_ID),
    })
  })
})

describe('useCancelTrainingSession', () => {
  it('cancela y deja la sesión cancelada en el detalle', async () => {
    const current = trainingSession()
    const cancelled = trainingSession({
      status: 'CANCELLED',
      endedAt: '2026-11-11T22:40:00Z',
    })
    vi.mocked(cancelTrainingSession).mockResolvedValue(cancelled)
    const { client, result } = setup(() =>
      useCancelTrainingSession(ATHLETE_ID, current.id),
    )
    client.setQueryData(inProgressSessionKey(USER_ID, ATHLETE_ID), current)

    await act(async () => {
      await result.current.mutateAsync()
    })

    expect(cancelTrainingSession).toHaveBeenCalledWith(ATHLETE_ID, current.id)
    expect(
      client.getQueryData(trainingSessionKey(USER_ID, ATHLETE_ID, current.id)),
    ).toBe(cancelled)
    expect(
      client.getQueryData(inProgressSessionKey(USER_ID, ATHLETE_ID)),
    ).toBeNull()
  })

  it('un error de red no toca la caché', async () => {
    vi.mocked(cancelTrainingSession).mockRejectedValue(
      new ApiError('No se pudo conectar con el servidor', 0),
    )
    const current = trainingSession()
    const { client, result, invalidate } = setup(() =>
      useCancelTrainingSession(ATHLETE_ID, current.id),
    )
    client.setQueryData(inProgressSessionKey(USER_ID, ATHLETE_ID), current)

    await act(async () => {
      await expect(result.current.mutateAsync()).rejects.toThrow()
    })

    expect(client.getQueryData(inProgressSessionKey(USER_ID, ATHLETE_ID))).toBe(
      current,
    )
    expect(invalidate).not.toHaveBeenCalled()
  })
})
