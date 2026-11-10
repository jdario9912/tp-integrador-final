import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { saveSession } from '../auth'
import { session } from '../../test/auth-fixtures'
import { routineDetail } from '../../test/routine-fixtures'
import { getRoutine } from './get-routine'
import { routineDetailKey, useRoutine } from './use-routine'

vi.mock('./get-routine', () => ({ getRoutine: vi.fn() }))

const queryClient = () =>
  new QueryClient({ defaultOptions: { queries: { retry: false } } })

const wrapperFor =
  (client: QueryClient) =>
  ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  )

beforeEach(() => {
  vi.mocked(getRoutine).mockReset()
})

describe('useRoutine', () => {
  it('pide la rutina y la guarda bajo la clave de detalle del usuario', async () => {
    const coach = session('COACH')
    saveSession(coach)
    const routine = routineDetail()
    vi.mocked(getRoutine).mockResolvedValue(routine)
    const client = queryClient()

    const { result } = renderHook(() => useRoutine(routine.id), {
      wrapper: wrapperFor(client),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(getRoutine).toHaveBeenCalledWith(routine.id)
    expect(
      client.getQueryData(routineDetailKey(coach.user.id, routine.id)),
    ).toBe(routine)
  })

  it('la clave cuelga de routines: las mutaciones de rutinas la invalidan', () => {
    expect(routineDetailKey('u1', 'r1')).toEqual([
      'routines',
      'u1',
      'detail',
      'r1',
    ])
  })

  it('no pide la rutina sin sesión', () => {
    const { result } = renderHook(() => useRoutine('abc'), {
      wrapper: wrapperFor(queryClient()),
    })

    expect(result.current.fetchStatus).toBe('idle')
    expect(getRoutine).not.toHaveBeenCalled()
  })
})
