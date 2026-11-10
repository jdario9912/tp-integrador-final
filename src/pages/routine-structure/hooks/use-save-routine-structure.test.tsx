import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../../../lib/api'
import { routineDetail } from '../../../test/routine-fixtures'
import { saveRoutineStructure } from '../actions/save-routine-structure'
import { useSaveRoutineStructure } from './use-save-routine-structure'

vi.mock('../actions/save-routine-structure', () => ({
  saveRoutineStructure: vi.fn(),
}))

const input = { days: [{ name: 'Empuje', exercises: [] }] }

const setup = () => {
  const client = new QueryClient({
    defaultOptions: { mutations: { retry: false } },
  })
  const invalidate = vi.spyOn(client, 'invalidateQueries')
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  )
  const { result } = renderHook(() => useSaveRoutineStructure('abc'), {
    wrapper,
  })
  return { result, invalidate }
}

beforeEach(() => {
  vi.mocked(saveRoutineStructure).mockReset()
})

describe('useSaveRoutineStructure', () => {
  it('guarda la estructura de la rutina e invalida las rutinas', async () => {
    const routine = routineDetail()
    vi.mocked(saveRoutineStructure).mockResolvedValue(routine)
    const { result, invalidate } = setup()

    await act(async () => {
      await expect(result.current.mutateAsync(input)).resolves.toBe(routine)
    })

    expect(saveRoutineStructure).toHaveBeenCalledWith('abc', input)
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['routines'] })
  })

  it('si falla no invalida y propaga el error', async () => {
    const error = new ApiError('El día tiene series registradas', 422)
    vi.mocked(saveRoutineStructure).mockRejectedValue(error)
    const { result, invalidate } = setup()

    await act(async () => {
      await expect(result.current.mutateAsync(input)).rejects.toBe(error)
    })

    expect(invalidate).not.toHaveBeenCalled()
  })
})
