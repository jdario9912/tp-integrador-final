import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { ApiError } from '../../../lib/api'
import { createdAthlete } from '../../../test/athlete-fixtures'
import { createAthlete } from '../actions/create-athlete'
import { useCreateAthlete } from './use-create-athlete'

vi.mock('../actions/create-athlete', () => ({ createAthlete: vi.fn() }))

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider
    client={
      new QueryClient({ defaultOptions: { mutations: { retry: false } } })
    }
  >
    {children}
  </QueryClientProvider>
)

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
})
