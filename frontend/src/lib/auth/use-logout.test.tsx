import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, screen, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { session } from '../../test/auth-fixtures'
import { paths } from '../../router/paths'
import { ApiError } from '../api'
import { logout } from './logout'
import { getSession, saveSession } from './session-store'
import { useLogout } from './use-logout'

vi.mock('./logout', () => ({ logout: vi.fn() }))

function LocationProbe() {
  const location = useLocation()
  return (
    <span data-testid="location">
      {location.pathname}|{JSON.stringify(location.state)}
    </span>
  )
}

const setup = () => {
  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false } },
  })
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[paths.dashboard]}>
        {children}
        <LocationProbe />
      </MemoryRouter>
    </QueryClientProvider>
  )
  return { queryClient, wrapper }
}

beforeEach(() => {
  vi.mocked(logout).mockReset()
})

describe('useLogout', () => {
  it('con 204 limpia la sesión y la caché y va al login sin aviso', async () => {
    saveSession(session())
    const { queryClient, wrapper } = setup()
    queryClient.setQueryData(['auth', 'me'], { id: 'ana' })
    vi.mocked(logout).mockResolvedValue(undefined)
    const { result } = renderHook(() => useLogout(), { wrapper })

    act(() => result.current.mutate())

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(getSession()).toBeNull()
    expect(queryClient.getQueryCache().getAll()).toHaveLength(0)
    expect(screen.getByTestId('location')).toHaveTextContent(
      `${paths.login}|null`,
    )
  })

  it.each([
    ['sin conexión', new ApiError('No se pudo conectar con el servidor', 0)],
    ['error del servidor', new ApiError('Error interno', 500)],
    ['el endpoint no existe', new ApiError('No encontrado', 404)],
    ['un error inesperado', new Error('fallo inesperado')],
  ])(
    'con %s cierra la sesión igual y avisa en el login',
    async (_case, error) => {
      saveSession(session())
      const { wrapper } = setup()
      vi.mocked(logout).mockRejectedValue(error)
      const { result } = renderHook(() => useLogout(), { wrapper })

      act(() => result.current.mutate())

      await waitFor(() => expect(result.current.isError).toBe(true))
      expect(getSession()).toBeNull()
      expect(screen.getByTestId('location')).toHaveTextContent(
        `${paths.login}|{"logoutFailed":true}`,
      )
    },
  )

  it('con 401 cierra la sesión sin aviso', async () => {
    saveSession(session())
    const { wrapper } = setup()
    vi.mocked(logout).mockRejectedValue(new ApiError('La sesión expiró', 401))
    const { result } = renderHook(() => useLogout(), { wrapper })

    act(() => result.current.mutate())

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(getSession()).toBeNull()
    expect(screen.getByTestId('location')).toHaveTextContent(
      `${paths.login}|null`,
    )
  })
})
