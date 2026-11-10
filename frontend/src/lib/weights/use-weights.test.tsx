import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { saveSession } from '../auth'
import { session } from '../../test/auth-fixtures'
import { weightsPage } from '../../test/weight-fixtures'
import { getWeights } from './get-weights'
import { athleteWeightsKey, useWeights } from './use-weights'

vi.mock('./get-weights', () => ({ getWeights: vi.fn() }))

const ATHLETE_ID = '3f1c2a9e-8b7d-4c1e-9a2b-5d6e7f8a9b0c'

const queryClient = () =>
  new QueryClient({ defaultOptions: { queries: { retry: false } } })

const wrapperFor =
  (client: QueryClient) =>
  ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  )

beforeEach(() => {
  vi.mocked(getWeights).mockReset()
})

describe('useWeights', () => {
  it('pide los registros del atleta y los guarda bajo su clave con los parámetros', async () => {
    const coach = session('COACH')
    saveSession(coach)
    const page = weightsPage()
    vi.mocked(getWeights).mockResolvedValue(page)
    const client = queryClient()

    const { result } = renderHook(() => useWeights(ATHLETE_ID, { size: 1 }), {
      wrapper: wrapperFor(client),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(getWeights).toHaveBeenCalledWith(ATHLETE_ID, { size: 1 })
    expect(
      client.getQueryData([
        ...athleteWeightsKey(coach.user.id, ATHLETE_ID),
        { size: 1 },
      ]),
    ).toBe(page)
  })

  it('la clave agrupa todos los registros del atleta: las mutaciones la invalidan entera', () => {
    expect(athleteWeightsKey('u1', 'a1')).toEqual(['weights', 'u1', 'a1'])
  })

  it('no pide los registros sin sesión', () => {
    const { result } = renderHook(() => useWeights(ATHLETE_ID), {
      wrapper: wrapperFor(queryClient()),
    })

    expect(result.current.fetchStatus).toBe('idle')
    expect(getWeights).not.toHaveBeenCalled()
  })

  it('no pide los registros sin atleta', () => {
    saveSession(session('ATHLETE'))

    const { result } = renderHook(() => useWeights(''), {
      wrapper: wrapperFor(queryClient()),
    })

    expect(result.current.fetchStatus).toBe('idle')
    expect(getWeights).not.toHaveBeenCalled()
  })
})
