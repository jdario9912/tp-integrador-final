import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../../../lib/api'
import { saveSession } from '../../../lib/auth'
import { athletesPage, createdAthlete } from '../../../test/athlete-fixtures'
import { session } from '../../../test/auth-fixtures'
import { getAthletes } from '../actions/get-athletes'
import type { AthleteFilters } from '../types'
import { useAthletes } from './use-athletes'

vi.mock('../actions/get-athletes', () => ({ getAthletes: vi.fn() }))

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider
    client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
  >
    {children}
  </QueryClientProvider>
)

beforeEach(() => {
  vi.mocked(getAthletes).mockReset()
})

describe('useAthletes', () => {
  it('expone la página de atletas del entrenador', async () => {
    saveSession(session('COACH'))
    const page = athletesPage()
    vi.mocked(getAthletes).mockResolvedValue(page)

    const { result } = renderHook(() => useAthletes({ page: 1 }), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toBe(page)
    expect(getAthletes).toHaveBeenCalledWith({ page: 1 })
  })

  it('expone el ApiError cuando falla', async () => {
    saveSession(session('COACH'))
    const error = new ApiError('Ocurrió un error inesperado', 500)
    vi.mocked(getAthletes).mockRejectedValue(error)

    const { result } = renderHook(() => useAthletes({ page: 1 }), { wrapper })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error).toBe(error)
  })

  it('no pide atletas sin sesión', () => {
    const { result } = renderHook(() => useAthletes({ page: 1 }), { wrapper })

    expect(result.current.fetchStatus).toBe('idle')
    expect(getAthletes).not.toHaveBeenCalled()
  })

  it('pide de nuevo al cambiar los filtros y mantiene la página anterior mientras carga', async () => {
    saveSession(session('COACH'))
    const first = athletesPage()
    vi.mocked(getAthletes)
      .mockResolvedValueOnce(first)
      .mockReturnValueOnce(new Promise(() => {}))

    const { result, rerender } = renderHook(
      ({ filters }: { filters: AthleteFilters }) => useAthletes(filters),
      {
        wrapper,
        initialProps: { filters: { page: 1 } as AthleteFilters },
      },
    )
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    rerender({ filters: { page: 1, name: 'ju' } })

    await waitFor(() =>
      expect(getAthletes).toHaveBeenLastCalledWith({ page: 1, name: 'ju' }),
    )
    expect(result.current.isPlaceholderData).toBe(true)
    expect(result.current.data?.content).toEqual([createdAthlete()])
  })
})
