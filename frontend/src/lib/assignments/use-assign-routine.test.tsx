import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../api'
import { saveSession } from '../auth'
import { session } from '../../test/auth-fixtures'
import { routineAssignment } from '../../test/assignment-fixtures'
import { assignRoutine } from './assign-routine'
import { useAssignRoutine } from './use-assign-routine'
import { athleteAssignmentsKey } from './use-assignments'

vi.mock('./assign-routine', () => ({ assignRoutine: vi.fn() }))

const coach = session('COACH')
const ATHLETE_ID = '3f1c2a9e-8b7d-4c1e-9a2b-5d6e7f8a9b0c'
const ROUTINE_ID = '7c9e6679-7425-40de-944b-e07fc1f90ae7'

const incomplete = new ApiError(
  'La rutina no tiene días o tiene días sin ejercicios. Complete su estructura antes de asignarla',
  422,
)

const setup = <T,>(useHook: () => T) => {
  const client = new QueryClient({
    defaultOptions: { mutations: { retry: false } },
  })
  const invalidate = vi.spyOn(client, 'invalidateQueries')
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  )
  const { result } = renderHook(useHook, { wrapper })
  return { result, invalidate }
}

beforeEach(() => {
  vi.mocked(assignRoutine).mockReset()
  saveSession(coach)
})

describe('useAssignRoutine', () => {
  it('asigna e invalida solo el historial del atleta', async () => {
    const assignment = routineAssignment()
    vi.mocked(assignRoutine).mockResolvedValue(assignment)
    const { result, invalidate } = setup(() => useAssignRoutine())
    const input = { routineId: ROUTINE_ID, replaceActive: false }

    await act(async () => {
      await expect(
        result.current.mutateAsync({ athleteId: ATHLETE_ID, input }),
      ).resolves.toBe(assignment)
    })

    expect(assignRoutine).toHaveBeenCalledWith(ATHLETE_ID, input)
    expect(invalidate).toHaveBeenCalledOnce()
    expect(invalidate).toHaveBeenCalledWith({
      queryKey: athleteAssignmentsKey(coach.user.id, ATHLETE_ID),
    })
  })

  it('si falla no invalida y propaga el error', async () => {
    vi.mocked(assignRoutine).mockRejectedValue(incomplete)
    const { result, invalidate } = setup(() => useAssignRoutine())

    await act(async () => {
      await expect(
        result.current.mutateAsync({
          athleteId: ATHLETE_ID,
          input: { routineId: ROUTINE_ID, replaceActive: false },
        }),
      ).rejects.toBe(incomplete)
    })

    expect(invalidate).not.toHaveBeenCalled()
  })
})
