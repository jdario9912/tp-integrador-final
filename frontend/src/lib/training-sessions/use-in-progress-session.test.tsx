import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { saveSession } from '../auth'
import { session } from '../../test/auth-fixtures'
import { trainingSession } from '../../test/training-session-fixtures'
import { getInProgressSession } from './get-in-progress-session'
import {
  athleteTrainingSessionsKey,
  inProgressSessionKey,
} from './training-session-keys'
import { useInProgressSession } from './use-in-progress-session'

vi.mock('./get-in-progress-session', () => ({
  getInProgressSession: vi.fn(),
}))

const ATHLETE_ID = session('ATHLETE').user.id

const queryClient = () =>
  new QueryClient({ defaultOptions: { queries: { retry: false } } })

const wrapperFor =
  (client: QueryClient) =>
  ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  )

beforeEach(() => {
  vi.mocked(getInProgressSession).mockReset()
})

describe('useInProgressSession', () => {
  it('pide la sesión en progreso del atleta y la guarda bajo su clave', async () => {
    saveSession(session('ATHLETE'))
    const inProgress = trainingSession()
    vi.mocked(getInProgressSession).mockResolvedValue(inProgress)
    const client = queryClient()

    const { result } = renderHook(() => useInProgressSession(ATHLETE_ID), {
      wrapper: wrapperFor(client),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toBe(inProgress)
    expect(getInProgressSession).toHaveBeenCalledWith(ATHLETE_ID)
    expect(
      client.getQueryData(inProgressSessionKey(ATHLETE_ID, ATHLETE_ID)),
    ).toBe(inProgress)
  })

  it('sin sesión en progreso es un éxito con data null, no un error', async () => {
    saveSession(session('ATHLETE'))
    vi.mocked(getInProgressSession).mockResolvedValue(null)

    const { result } = renderHook(() => useInProgressSession(ATHLETE_ID), {
      wrapper: wrapperFor(queryClient()),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toBeNull()
    expect(result.current.error).toBeNull()
  })

  it('las claves de las sesiones cuelgan del usuario y del atleta', () => {
    expect(athleteTrainingSessionsKey('u1', 'a1')).toEqual([
      'training-sessions',
      'u1',
      'a1',
    ])
    expect(inProgressSessionKey('u1', 'a1')).toEqual([
      'training-sessions',
      'u1',
      'a1',
      'in-progress',
    ])
  })

  it('no pide nada sin sesión de login', () => {
    const { result } = renderHook(() => useInProgressSession(ATHLETE_ID), {
      wrapper: wrapperFor(queryClient()),
    })

    expect(result.current.fetchStatus).toBe('idle')
    expect(getInProgressSession).not.toHaveBeenCalled()
  })

  it('no pide nada sin atleta', () => {
    saveSession(session('ATHLETE'))

    const { result } = renderHook(() => useInProgressSession(''), {
      wrapper: wrapperFor(queryClient()),
    })

    expect(result.current.fetchStatus).toBe('idle')
    expect(getInProgressSession).not.toHaveBeenCalled()
  })
})
