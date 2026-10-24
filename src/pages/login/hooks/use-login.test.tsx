import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../../../lib/api'
import { getSession } from '../../../lib/auth'
import { authResponse } from '../../../test/auth-fixtures'
import { login } from '../actions/login'
import { useLogin } from './use-login'

vi.mock('../actions/login', () => ({ login: vi.fn() }))

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider
    client={
      new QueryClient({ defaultOptions: { mutations: { retry: false } } })
    }
  >
    {children}
  </QueryClientProvider>
)

const input = { email: 'ana@example.com', password: '12345678' }

beforeEach(() => {
  vi.mocked(login).mockReset()
})

describe('useLogin', () => {
  it('guarda la sesión cuando el login es correcto', async () => {
    vi.mocked(login).mockResolvedValue(authResponse('ATHLETE'))
    const { result } = renderHook(() => useLogin(), { wrapper })

    act(() => result.current.mutate(input))

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(getSession()).toMatchObject({
      accessToken: 'access-1',
      refreshToken: 'refresh-1',
      user: { role: 'ATHLETE' },
    })
  })

  it('no guarda nada si el login falla', async () => {
    const error = new ApiError('Email o contraseña incorrectos', 401)
    vi.mocked(login).mockRejectedValue(error)
    const { result } = renderHook(() => useLogin(), { wrapper })

    act(() => result.current.mutate(input))

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error).toBe(error)
    expect(getSession()).toBeNull()
  })
})
