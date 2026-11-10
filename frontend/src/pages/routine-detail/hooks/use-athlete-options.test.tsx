import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { saveSession } from '../../../lib/auth'
import { athletesPage } from '../../../test/athlete-fixtures'
import { session } from '../../../test/auth-fixtures'
import { getAthleteOptions } from '../actions/get-athlete-options'
import { useAthleteOptions } from './use-athlete-options'

vi.mock('../actions/get-athlete-options', () => ({
  getAthleteOptions: vi.fn(),
}))

const setup = () => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  )
  const { result } = renderHook(() => useAthleteOptions(), { wrapper })
  return { client, result }
}

beforeEach(() => {
  vi.mocked(getAthleteOptions).mockReset()
})

describe('useAthleteOptions', () => {
  it('guarda las opciones bajo ["athletes"] para que las mutaciones de atletas las refresquen', async () => {
    const coach = session('COACH')
    saveSession(coach)
    const page = athletesPage()
    vi.mocked(getAthleteOptions).mockResolvedValue(page)

    const { client, result } = setup()

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(client.getQueryData(['athletes', coach.user.id, 'options'])).toBe(
      page,
    )
  })

  it('no las pide sin sesión', () => {
    const { result } = setup()

    expect(result.current.fetchStatus).toBe('idle')
    expect(getAthleteOptions).not.toHaveBeenCalled()
  })
})
