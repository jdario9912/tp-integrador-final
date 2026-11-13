import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { saveSession } from '../auth'
import { legsDay } from '../../test/athlete-routine-fixtures'
import { session } from '../../test/auth-fixtures'
import {
  SESSION_ID,
  trainingSession,
} from '../../test/training-session-fixtures'
import { getTrainingSession } from './get-training-session'
import {
  inProgressSessionKey,
  trainingSessionKey,
} from './training-session-keys'
import { useTrainingSession } from './use-training-session'

vi.mock('./get-training-session', () => ({ getTrainingSession: vi.fn() }))

const ATHLETE_ID = session('ATHLETE').user.id

const queryClient = () =>
  new QueryClient({ defaultOptions: { queries: { retry: false } } })

const wrapperFor =
  (client: QueryClient) =>
  ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  )

beforeEach(() => {
  vi.mocked(getTrainingSession).mockReset()
  saveSession(session('ATHLETE'))
})

describe('useTrainingSession', () => {
  it('pide la sesión del atleta y la guarda bajo su clave', async () => {
    const detail = trainingSession()
    vi.mocked(getTrainingSession).mockResolvedValue(detail)
    const client = queryClient()

    const { result } = renderHook(
      () => useTrainingSession(ATHLETE_ID, SESSION_ID),
      { wrapper: wrapperFor(client) },
    )

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toBe(detail)
    expect(getTrainingSession).toHaveBeenCalledWith(ATHLETE_ID, SESSION_ID)
    expect(
      client.getQueryData(
        trainingSessionKey(ATHLETE_ID, ATHLETE_ID, SESSION_ID),
      ),
    ).toBe(detail)
    expect(trainingSessionKey('u1', 'a1', 's1')).toEqual([
      'training-sessions',
      'u1',
      'a1',
      'detail',
      's1',
    ])
  })

  it('al retomar muestra al instante la sesión en progreso de la caché y la vuelve a pedir', async () => {
    const cached = trainingSession()
    // el entrenador cambió el día: la respuesta nueva reemplaza a la de la caché
    const fresh = trainingSession({ day: { ...cached.day, name: 'Empuje' } })
    vi.mocked(getTrainingSession).mockResolvedValue(fresh)
    const client = queryClient()
    client.setQueryData(inProgressSessionKey(ATHLETE_ID, ATHLETE_ID), cached)

    const { result } = renderHook(
      () => useTrainingSession(ATHLETE_ID, SESSION_ID),
      { wrapper: wrapperFor(client) },
    )

    expect(result.current.data).toBe(cached)
    await waitFor(() => expect(result.current.data).toEqual(fresh))
    expect(getTrainingSession).toHaveBeenCalledTimes(1)
  })

  it('no usa la sesión en progreso si es otra', async () => {
    vi.mocked(getTrainingSession).mockResolvedValue(trainingSession())
    const client = queryClient()
    client.setQueryData(
      inProgressSessionKey(ATHLETE_ID, ATHLETE_ID),
      trainingSession({ id: 'otra-sesion', day: legsDay() }),
    )

    const { result } = renderHook(
      () => useTrainingSession(ATHLETE_ID, SESSION_ID),
      { wrapper: wrapperFor(client) },
    )

    expect(result.current.data).toBeUndefined()
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.id).toBe(SESSION_ID)
  })

  it('no pide nada sin la sesión de la URL', () => {
    const { result } = renderHook(() => useTrainingSession(ATHLETE_ID, ''), {
      wrapper: wrapperFor(queryClient()),
    })

    expect(result.current.fetchStatus).toBe('idle')
    expect(getTrainingSession).not.toHaveBeenCalled()
  })

  it('no pide nada sin sesión de login', () => {
    localStorage.clear()

    const { result } = renderHook(
      () => useTrainingSession(ATHLETE_ID, SESSION_ID),
      { wrapper: wrapperFor(queryClient()) },
    )

    expect(result.current.fetchStatus).toBe('idle')
    expect(getTrainingSession).not.toHaveBeenCalled()
  })
})
