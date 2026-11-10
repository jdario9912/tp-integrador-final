import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../api'
import { saveSession } from '../auth'
import { session } from '../../test/auth-fixtures'
import { routineAssignment } from '../../test/assignment-fixtures'
import { assignRoutine } from './assign-routine'
import { useAssignRoutineFlow } from './use-assign-routine-flow'

vi.mock('./assign-routine', () => ({ assignRoutine: vi.fn() }))

const coach = session('COACH')
const ATHLETE_ID = '3f1c2a9e-8b7d-4c1e-9a2b-5d6e7f8a9b0c'
const ROUTINE_ID = '7c9e6679-7425-40de-944b-e07fc1f90ae7'

const conflict = new ApiError(
  'El atleta ya tiene asignada la rutina «Fuerza». Confirme el reemplazo para asignar la nueva',
  409,
)
const incomplete = new ApiError(
  'La rutina no tiene días o tiene días sin ejercicios. Complete su estructura antes de asignarla',
  422,
)

const setup = <T,>(useHook: () => T) => {
  const client = new QueryClient({
    defaultOptions: { mutations: { retry: false } },
  })
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  )
  const { result } = renderHook(useHook, { wrapper })
  return { result }
}

beforeEach(() => {
  vi.mocked(assignRoutine).mockReset()
  saveSession(coach)
})

describe('useAssignRoutineFlow', () => {
  it('sin rutina activa asigna en un solo pedido sin replaceActive', async () => {
    const assignment = routineAssignment()
    vi.mocked(assignRoutine).mockResolvedValue(assignment)
    const onAssigned = vi.fn()
    const { result } = setup(() => useAssignRoutineFlow({ onAssigned }))

    await act(() => result.current.assign(ATHLETE_ID, ROUTINE_ID))

    expect(assignRoutine).toHaveBeenCalledOnce()
    expect(assignRoutine).toHaveBeenCalledWith(ATHLETE_ID, {
      routineId: ROUTINE_ID,
      replaceActive: false,
    })
    expect(onAssigned).toHaveBeenCalledWith(assignment, ATHLETE_ID)
    expect(result.current.pendingReplace).toBeUndefined()
    expect(result.current.error).toBeNull()
  })

  it('el 409 deja el reemplazo pendiente sin mostrarlo como error', async () => {
    vi.mocked(assignRoutine).mockRejectedValue(conflict)
    const onAssigned = vi.fn()
    const { result } = setup(() => useAssignRoutineFlow({ onAssigned }))

    await act(() => result.current.assign(ATHLETE_ID, ROUTINE_ID))

    expect(result.current.pendingReplace).toEqual({
      athleteId: ATHLETE_ID,
      routineId: ROUTINE_ID,
      message: conflict.message,
    })
    expect(result.current.error).toBeNull()
    expect(onAssigned).not.toHaveBeenCalled()
  })

  it('confirm reenvía con replaceActive y limpia el pendiente', async () => {
    const assignment = routineAssignment()
    vi.mocked(assignRoutine)
      .mockRejectedValueOnce(conflict)
      .mockResolvedValueOnce(assignment)
    const onAssigned = vi.fn()
    const { result } = setup(() => useAssignRoutineFlow({ onAssigned }))

    await act(() => result.current.assign(ATHLETE_ID, ROUTINE_ID))
    await act(() => result.current.confirm())

    expect(assignRoutine).toHaveBeenLastCalledWith(ATHLETE_ID, {
      routineId: ROUTINE_ID,
      replaceActive: true,
    })
    expect(onAssigned).toHaveBeenCalledWith(assignment, ATHLETE_ID)
    expect(result.current.pendingReplace).toBeUndefined()
    expect(result.current.error).toBeNull()
  })

  it('si falla la confirmación cierra el pendiente y deja el error', async () => {
    vi.mocked(assignRoutine)
      .mockRejectedValueOnce(conflict)
      .mockRejectedValueOnce(incomplete)
    const { result } = setup(() => useAssignRoutineFlow())

    await act(() => result.current.assign(ATHLETE_ID, ROUTINE_ID))
    await act(() => result.current.confirm())

    expect(result.current.pendingReplace).toBeUndefined()
    await waitFor(() => expect(result.current.error).toBe(incomplete))
  })

  it('cancel limpia el pendiente sin reenviar', async () => {
    vi.mocked(assignRoutine).mockRejectedValue(conflict)
    const { result } = setup(() => useAssignRoutineFlow())

    await act(() => result.current.assign(ATHLETE_ID, ROUTINE_ID))
    act(() => result.current.cancel())

    expect(result.current.pendingReplace).toBeUndefined()
    await waitFor(() => expect(result.current.error).toBeNull())
    expect(assignRoutine).toHaveBeenCalledOnce()
  })

  it('el 422 queda en error y no pide confirmación', async () => {
    vi.mocked(assignRoutine).mockRejectedValue(incomplete)
    const { result } = setup(() => useAssignRoutineFlow())

    await act(() => result.current.assign(ATHLETE_ID, ROUTINE_ID))

    expect(result.current.pendingReplace).toBeUndefined()
    await waitFor(() => expect(result.current.error).toBe(incomplete))
  })
})
