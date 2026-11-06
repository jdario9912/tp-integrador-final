import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { saveSession } from '../../../lib/auth'
import { session } from '../../../test/auth-fixtures'
import { routinesPage } from '../../../test/routine-fixtures'
import { getRoutines } from '../actions/get-routines'
import { useRoutines } from './use-routines'

vi.mock('../actions/get-routines', () => ({ getRoutines: vi.fn() }))

const queryClient = () =>
  new QueryClient({ defaultOptions: { queries: { retry: false } } })

const wrapperFor =
  (client: QueryClient) =>
  ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  )

beforeEach(() => {
  vi.mocked(getRoutines).mockReset()
})

describe('useRoutines', () => {
  it('pide la página y la guarda bajo la clave del entrenador', async () => {
    const coach = session('COACH')
    saveSession(coach)
    const page = routinesPage()
    vi.mocked(getRoutines).mockResolvedValue(page)
    const client = queryClient()

    const { result } = renderHook(() => useRoutines({ page: 2 }), {
      wrapper: wrapperFor(client),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(getRoutines).toHaveBeenCalledWith({ page: 2 })
    expect(client.getQueryData(['routines', coach.user.id, { page: 2 }])).toBe(
      page,
    )
  })

  it('no pide las rutinas sin sesión', () => {
    const { result } = renderHook(() => useRoutines({ page: 1 }), {
      wrapper: wrapperFor(queryClient()),
    })

    expect(result.current.fetchStatus).toBe('idle')
    expect(getRoutines).not.toHaveBeenCalled()
  })
})
