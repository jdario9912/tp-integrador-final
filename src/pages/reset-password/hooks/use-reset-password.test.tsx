import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../../../lib/api'
import { getSession, saveSession } from '../../../lib/auth'
import { session } from '../../../test/auth-fixtures'
import { resetPassword } from '../actions/reset-password'
import { useResetPassword } from './use-reset-password'

vi.mock('../actions/reset-password', () => ({ resetPassword: vi.fn() }))

const setup = () => {
  const client = new QueryClient({
    defaultOptions: { mutations: { retry: false } },
  })
  client.setQueryData(['athletes'], ['cacheado'])
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  )
  return { client, ...renderHook(() => useResetPassword(), { wrapper }) }
}

const input = { token: 'token-1', newPassword: 'nueva-clave' }

beforeEach(() => {
  vi.mocked(resetPassword).mockReset()
})

describe('useResetPassword (US-44)', () => {
  it('con el 204 borra la sesión guardada y la caché', async () => {
    saveSession(session())
    vi.mocked(resetPassword).mockResolvedValue(undefined)
    const { client, result } = setup()

    act(() => result.current.mutate(input))

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(getSession()).toBeNull()
    expect(client.getQueryData(['athletes'])).toBeUndefined()
  })

  it('si falla no toca la sesión ni la caché', async () => {
    saveSession(session())
    vi.mocked(resetPassword).mockRejectedValue(
      new ApiError('El enlace venció', 400),
    )
    const { client, result } = setup()

    act(() => result.current.mutate(input))

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(getSession()).not.toBeNull()
    expect(client.getQueryData(['athletes'])).toEqual(['cacheado'])
  })
})
