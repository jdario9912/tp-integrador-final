import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { saveSession } from '../auth'
import { session } from '../../test/auth-fixtures'
import { muscleGroups } from '../../test/exercise-fixtures'
import { getMuscleGroups } from './get-muscle-groups'
import { useMuscleGroups } from './use-muscle-groups'

vi.mock('./get-muscle-groups', () => ({ getMuscleGroups: vi.fn() }))

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider
    client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
  >
    {children}
  </QueryClientProvider>
)

beforeEach(() => {
  vi.mocked(getMuscleGroups).mockReset()
})

describe('useMuscleGroups', () => {
  it('expone el catálogo y no lo considera viejo', async () => {
    saveSession(session('COACH'))
    vi.mocked(getMuscleGroups).mockResolvedValue(muscleGroups)

    const { result } = renderHook(() => useMuscleGroups(), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toBe(muscleGroups)
    expect(result.current.isStale).toBe(false)
  })

  it('no pide el catálogo sin sesión', () => {
    const { result } = renderHook(() => useMuscleGroups(), { wrapper })

    expect(result.current.fetchStatus).toBe('idle')
    expect(getMuscleGroups).not.toHaveBeenCalled()
  })
})
