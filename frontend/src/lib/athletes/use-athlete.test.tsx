import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { saveSession } from '../auth'
import { createdAthlete } from '../../test/athlete-fixtures'
import { session } from '../../test/auth-fixtures'
import { getAthlete } from './get-athlete'
import { athleteDetailKey, useAthlete } from './use-athlete'

vi.mock('./get-athlete', () => ({ getAthlete: vi.fn() }))

const queryClient = () =>
  new QueryClient({ defaultOptions: { queries: { retry: false } } })

const wrapperFor =
  (client: QueryClient) =>
  ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  )

beforeEach(() => {
  vi.mocked(getAthlete).mockReset()
})

describe('useAthlete', () => {
  it('pide el atleta y lo guarda bajo la clave de detalle del usuario', async () => {
    const coach = session('COACH')
    saveSession(coach)
    const athlete = createdAthlete()
    vi.mocked(getAthlete).mockResolvedValue(athlete)
    const client = queryClient()

    const { result } = renderHook(() => useAthlete(athlete.id), {
      wrapper: wrapperFor(client),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(getAthlete).toHaveBeenCalledWith(athlete.id)
    expect(
      client.getQueryData(athleteDetailKey(coach.user.id, athlete.id)),
    ).toBe(athlete)
  })

  it('la clave cuelga de athletes: las mutaciones de atletas la invalidan', () => {
    expect(athleteDetailKey('u1', 'a1')).toEqual([
      'athletes',
      'u1',
      'detail',
      'a1',
    ])
  })

  it('no pide el atleta sin sesión', () => {
    const { result } = renderHook(() => useAthlete('abc'), {
      wrapper: wrapperFor(queryClient()),
    })

    expect(result.current.fetchStatus).toBe('idle')
    expect(getAthlete).not.toHaveBeenCalled()
  })
})
