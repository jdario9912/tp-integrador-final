import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { ApiError } from '../../../lib/api'
import { createCoach } from '../actions/create-coach'
import { useCreateCoach } from './use-create-coach'

vi.mock('../actions/create-coach', () => ({ createCoach: vi.fn() }))

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
  firstName: 'Ana',
  lastName: 'Pérez',
  email: 'ana@example.com',
  password: '12345678',
}

describe('useCreateCoach', () => {
  it('expone el entrenador creado', async () => {
    const coach = {
      id: '1',
      ...input,
      phone: null,
      specialty: null,
      licenseNumber: null,
      bio: null,
      createdAt: '2026-10-21T17:16:57Z',
    }
    vi.mocked(createCoach).mockResolvedValue(coach)
    const { result } = renderHook(() => useCreateCoach(), { wrapper })

    act(() => result.current.mutate(input))

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toBe(coach)
    expect(vi.mocked(createCoach).mock.calls[0][0]).toBe(input)
  })

  it('expone el ApiError cuando falla', async () => {
    const error = new ApiError('Ya existe un usuario', 409)
    vi.mocked(createCoach).mockRejectedValue(error)
    const { result } = renderHook(() => useCreateCoach(), { wrapper })

    act(() => result.current.mutate(input))

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error).toBe(error)
  })
})
