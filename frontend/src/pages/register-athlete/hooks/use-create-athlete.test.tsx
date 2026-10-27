import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../../../lib/api'
import { createdAthlete } from '../../../test/athlete-fixtures'
import { createAthlete } from '../actions/create-athlete'
import { useCreateAthlete } from './use-create-athlete'

vi.mock('../actions/create-athlete', () => ({ createAthlete: vi.fn() }))

let queryClient: QueryClient

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
)

beforeEach(() => {
  queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false } },
  })
})

const input = {
  firstName: 'Juana',
  lastName: 'Pérez',
  email: 'juana@example.com',
  password: '12345678',
}

describe('useCreateAthlete', () => {
  it('expone el atleta creado', async () => {
    const athlete = createdAthlete()
    vi.mocked(createAthlete).mockResolvedValue(athlete)
    const { result } = renderHook(() => useCreateAthlete(), { wrapper })

    act(() => result.current.mutate(input))

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toBe(athlete)
    expect(vi.mocked(createAthlete).mock.calls[0][0]).toBe(input)
  })

  it('expone el ApiError cuando falla', async () => {
    const error = new ApiError('Ya existe un usuario', 409)
    vi.mocked(createAthlete).mockRejectedValue(error)
    const { result } = renderHook(() => useCreateAthlete(), { wrapper })

    act(() => result.current.mutate(input))

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error).toBe(error)
  })

  it('invalida el listado de atletas después del alta', async () => {
    vi.mocked(createAthlete).mockResolvedValue(createdAthlete())
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries')
    const { result } = renderHook(() => useCreateAthlete(), { wrapper })

    act(() => result.current.mutate(input))

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['athletes'] })
  })

  it('no invalida el listado si el alta falla', async () => {
    vi.mocked(createAthlete).mockRejectedValue(new ApiError('Conflicto', 409))
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries')
    const { result } = renderHook(() => useCreateAthlete(), { wrapper })

    act(() => result.current.mutate(input))

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(invalidate).not.toHaveBeenCalled()
  })
})
