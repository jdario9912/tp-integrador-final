import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../api'
import { saveSession } from '../auth'
import { TORSO_DAY_ID } from '../../test/athlete-routine-fixtures'
import { session } from '../../test/auth-fixtures'
import { trainingSession } from '../../test/training-session-fixtures'
import { startTrainingSession } from './start-training-session'
import {
  inProgressSessionKey,
  trainingSessionKey,
} from './training-session-keys'
import { useStartTrainingSession } from './use-start-training-session'

vi.mock('./start-training-session', () => ({
  startTrainingSession: vi.fn(),
}))

const ATHLETE_ID = session('ATHLETE').user.id
const input = { routineDayId: TORSO_DAY_ID }

const setup = () => {
  const client = new QueryClient({
    defaultOptions: { mutations: { retry: false } },
  })
  const invalidate = vi.spyOn(client, 'invalidateQueries')
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  )
  const { result } = renderHook(() => useStartTrainingSession(ATHLETE_ID), {
    wrapper,
  })
  return { client, result, invalidate }
}

beforeEach(() => {
  vi.mocked(startTrainingSession).mockReset()
  saveSession(session('ATHLETE'))
})

describe('useStartTrainingSession', () => {
  it('inicia la sesión y la guarda como la sesión en progreso y como detalle', async () => {
    const started = trainingSession()
    vi.mocked(startTrainingSession).mockResolvedValue(started)
    const { client, result, invalidate } = setup()

    await act(async () => {
      await expect(result.current.mutateAsync(input)).resolves.toBe(started)
    })

    expect(startTrainingSession).toHaveBeenCalledWith(ATHLETE_ID, input)
    expect(
      client.getQueryData(inProgressSessionKey(ATHLETE_ID, ATHLETE_ID)),
    ).toBe(started)
    expect(
      client.getQueryData(
        trainingSessionKey(ATHLETE_ID, ATHLETE_ID, started.id),
      ),
    ).toBe(started)
    expect(invalidate).not.toHaveBeenCalled()
  })

  it('ante un 409 vuelve a pedir la sesión en progreso y propaga el error', async () => {
    const error = new ApiError(
      'Ya tenés un entrenamiento en curso. Retomalo para continuar',
      409,
    )
    vi.mocked(startTrainingSession).mockRejectedValue(error)
    const { client, result, invalidate } = setup()

    await act(async () => {
      await expect(result.current.mutateAsync(input)).rejects.toBe(error)
    })

    expect(invalidate).toHaveBeenCalledWith({
      queryKey: inProgressSessionKey(ATHLETE_ID, ATHLETE_ID),
    })
    expect(
      client.getQueryData(inProgressSessionKey(ATHLETE_ID, ATHLETE_ID)),
    ).toBeUndefined()
  })

  it.each([
    [422, 'No tenés una rutina activa para iniciar un entrenamiento'],
    [0, 'No se pudo conectar con el servidor'],
  ])(
    'ante un %i no toca la caché y propaga el error',
    async (status, message) => {
      const error = new ApiError(message, status)
      vi.mocked(startTrainingSession).mockRejectedValue(error)
      const { result, invalidate } = setup()

      await act(async () => {
        await expect(result.current.mutateAsync(input)).rejects.toBe(error)
      })

      expect(invalidate).not.toHaveBeenCalled()
    },
  )
})
