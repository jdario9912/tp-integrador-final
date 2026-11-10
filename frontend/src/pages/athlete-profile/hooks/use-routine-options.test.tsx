import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { saveSession } from '../../../lib/auth'
import { session } from '../../../test/auth-fixtures'
import { routinesPage } from '../../../test/routine-fixtures'
import { getRoutineOptions } from '../actions/get-routine-options'
import { useRoutineOptions } from './use-routine-options'

vi.mock('../actions/get-routine-options', () => ({
  getRoutineOptions: vi.fn(),
}))

const setup = (enabled: boolean) => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  )
  const { result } = renderHook(() => useRoutineOptions({ enabled }), {
    wrapper,
  })
  return { client, result }
}

beforeEach(() => {
  vi.mocked(getRoutineOptions).mockReset()
})

describe('useRoutineOptions', () => {
  it('guarda las opciones bajo ["routines"] para que crear o duplicar las refresque', async () => {
    const coach = session('COACH')
    saveSession(coach)
    const page = routinesPage()
    vi.mocked(getRoutineOptions).mockResolvedValue(page)

    const { client, result } = setup(true)

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(client.getQueryData(['routines', coach.user.id, 'options'])).toBe(
      page,
    )
  })

  it('no las pide mientras el formulario está cerrado', () => {
    saveSession(session('COACH'))

    const { result } = setup(false)

    expect(result.current.fetchStatus).toBe('idle')
    expect(getRoutineOptions).not.toHaveBeenCalled()
  })
})
