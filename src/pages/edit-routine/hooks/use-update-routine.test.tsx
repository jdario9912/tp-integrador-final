import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../../../lib/api'
import { routineDetail } from '../../../test/routine-fixtures'
import { updateRoutine } from '../actions/update-routine'
import { useUpdateRoutine } from './use-update-routine'

vi.mock('../actions/update-routine', () => ({ updateRoutine: vi.fn() }))

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
  const { result } = renderHook(() => useUpdateRoutine('abc'), { wrapper })
  return { result, invalidate }
}

beforeEach(() => {
  vi.mocked(updateRoutine).mockReset()
})

describe('useUpdateRoutine', () => {
  it('edita la rutina de la página e invalida las rutinas', async () => {
    const routine = routineDetail()
    vi.mocked(updateRoutine).mockResolvedValue(routine)
    const { result, invalidate } = setup()

    await act(async () => {
      await expect(result.current.mutateAsync(input)).resolves.toBe(routine)
    })

    expect(updateRoutine).toHaveBeenCalledWith('abc', input)
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['routines'] })
  })

  it('si falla no invalida y propaga el error', async () => {
    const error = new ApiError('Ya tiene una rutina llamada Fuerza', 409)
    vi.mocked(updateRoutine).mockRejectedValue(error)
    const { result, invalidate } = setup()

    await act(async () => {
      await expect(result.current.mutateAsync(input)).rejects.toBe(error)
    })

    expect(invalidate).not.toHaveBeenCalled()
  })
})
