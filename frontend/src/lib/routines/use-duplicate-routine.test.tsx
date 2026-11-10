import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../api'
import { routineDetail } from '../../test/routine-fixtures'
import { duplicateRoutine } from './duplicate-routine'
import { useDuplicateRoutine } from './use-duplicate-routine'

vi.mock('./duplicate-routine', () => ({ duplicateRoutine: vi.fn() }))

const setup = () => {
  const client = new QueryClient({
    defaultOptions: { mutations: { retry: false } },
  })
  const invalidate = vi.spyOn(client, 'invalidateQueries')
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  )
  const { result } = renderHook(() => useDuplicateRoutine(), { wrapper })
  return { result, invalidate }
}

beforeEach(() => {
  vi.mocked(duplicateRoutine).mockReset()
})

describe('useDuplicateRoutine', () => {
  it('duplica la rutina e invalida las rutinas', async () => {
    const copy = routineDetail({ id: 'copia' })
    vi.mocked(duplicateRoutine).mockResolvedValue(copy)
    const { result, invalidate } = setup()

    await act(async () => {
      await expect(result.current.mutateAsync('abc')).resolves.toBe(copy)
    })

    expect(vi.mocked(duplicateRoutine).mock.calls[0][0]).toBe('abc')
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['routines'] })
  })

  it('si falla no invalida y propaga el error', async () => {
    const error = new ApiError(
      'No tiene permisos para acceder a esta rutina',
      403,
    )
    vi.mocked(duplicateRoutine).mockRejectedValue(error)
    const { result, invalidate } = setup()

    await act(async () => {
      await expect(result.current.mutateAsync('abc')).rejects.toBe(error)
    })

    expect(invalidate).not.toHaveBeenCalled()
  })
})
