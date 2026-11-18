import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { saveSession } from '../auth'
import { session } from '../../test/auth-fixtures'
import { coachDashboard } from '../../test/coach-dashboard-fixtures'
import { getCoachDashboard } from './get-coach-dashboard'
import { coachDashboardKey, useCoachDashboard } from './use-coach-dashboard'

vi.mock('./get-coach-dashboard', () => ({ getCoachDashboard: vi.fn() }))

const queryClient = () =>
  new QueryClient({ defaultOptions: { queries: { retry: false } } })

const wrapperFor =
  (client: QueryClient) =>
  ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  )

beforeEach(() => {
  vi.mocked(getCoachDashboard).mockReset()
})

describe('useCoachDashboard (US-11)', () => {
  it('pide el panel y lo guarda bajo la clave del entrenador de la sesión', async () => {
    const coach = session('COACH')
    saveSession(coach)
    const dashboard = coachDashboard()
    vi.mocked(getCoachDashboard).mockResolvedValue(dashboard)
    const client = queryClient()

    const { result } = renderHook(() => useCoachDashboard(), {
      wrapper: wrapperFor(client),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toBe(dashboard)
    expect(client.getQueryData(coachDashboardKey(coach.user.id))).toBe(
      dashboard,
    )
  })

  it('no pide el panel sin sesión', () => {
    const { result } = renderHook(() => useCoachDashboard(), {
      wrapper: wrapperFor(queryClient()),
    })

    expect(result.current.fetchStatus).toBe('idle')
    expect(getCoachDashboard).not.toHaveBeenCalled()
  })
})
