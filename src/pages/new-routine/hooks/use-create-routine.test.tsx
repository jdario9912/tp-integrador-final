import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../../../lib/api'
import { createdRoutine } from '../../../test/routine-fixtures'
import { createRoutine } from '../actions/create-routine'
import { useCreateRoutine } from './use-create-routine'

vi.mock('../actions/create-routine', () => ({ createRoutine: vi.fn() }))

const input = {
  name: 'Fase de volumen',
  description: null,
  goal: null,
  daysPerWeek: null,
  durationWeeks: null,
  isTemplate: false,
}

const setup = () => {
  const client = new QueryClient({
    defaultOptions: { mutations: { retry: false } },
  })
  const invalidate = vi.spyOn(client, 'invalidateQueries')
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  )
  const { result } = renderHook(() => useCreateRoutine(), { wrapper })
  return { result, invalidate }
}

beforeEach(() => {
  vi.mocked(createRoutine).mockReset()
})

describe('useCreateRoutine', () => {
  it('crea la rutina e invalida el listado', async () => {
    const routine = createdRoutine()
    vi.mocked(createRoutine).mockResolvedValue(routine)
    const { result, invalidate } = setup()

    await act(async () => {
      await expect(result.current.mutateAsync(input)).resolves.toBe(routine)
    })

    expect(vi.mocked(createRoutine).mock.calls[0][0]).toEqual(input)
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['routines'] })
  })

  it('si falla no invalida y propaga el error', async () => {
    const error = new ApiError(
      'Ya tiene una rutina llamada Fase de volumen',
      409,
    )
    vi.mocked(createRoutine).mockRejectedValue(error)
    const { result, invalidate } = setup()

    await act(async () => {
      await expect(result.current.mutateAsync(input)).rejects.toBe(error)
    })

    expect(invalidate).not.toHaveBeenCalled()
  })
})
