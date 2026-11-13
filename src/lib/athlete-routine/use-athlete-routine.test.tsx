import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { athleteAssignmentsKey } from '../assignments'
import { saveSession } from '../auth'
import { session } from '../../test/auth-fixtures'
import { athleteRoutine } from '../../test/athlete-routine-fixtures'
import { getAthleteRoutine } from './get-athlete-routine'
import { athleteRoutineKey, useAthleteRoutine } from './use-athlete-routine'

vi.mock('./get-athlete-routine', () => ({ getAthleteRoutine: vi.fn() }))

const ATHLETE_ID = session('ATHLETE').user.id

const queryClient = () =>
  new QueryClient({ defaultOptions: { queries: { retry: false } } })

const wrapperFor =
  (client: QueryClient) =>
  ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  )

beforeEach(() => {
  vi.mocked(getAthleteRoutine).mockReset()
})

describe('useAthleteRoutine', () => {
  it('pide la rutina del atleta y la guarda bajo su clave', async () => {
    const athlete = session('ATHLETE')
    saveSession(athlete)
    const routine = athleteRoutine()
    vi.mocked(getAthleteRoutine).mockResolvedValue(routine)
    const client = queryClient()

    const { result } = renderHook(() => useAthleteRoutine(ATHLETE_ID), {
      wrapper: wrapperFor(client),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toBe(routine)
    expect(getAthleteRoutine).toHaveBeenCalledWith(ATHLETE_ID)
    expect(
      client.getQueryData(athleteRoutineKey(athlete.user.id, ATHLETE_ID)),
    ).toBe(routine)
  })

  it('sin rutina activa es un éxito con data null, no un error', async () => {
    saveSession(session('ATHLETE'))
    vi.mocked(getAthleteRoutine).mockResolvedValue(null)

    const { result } = renderHook(() => useAthleteRoutine(ATHLETE_ID), {
      wrapper: wrapperFor(queryClient()),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toBeNull()
    expect(result.current.error).toBeNull()
  })

  it('la clave cuelga de las asignaciones del atleta: asignar otra rutina la invalida', () => {
    expect(athleteRoutineKey('u1', 'a1')).toEqual([
      ...athleteAssignmentsKey('u1', 'a1'),
      'routine',
    ])
  })

  it('no pide la rutina sin sesión', () => {
    const { result } = renderHook(() => useAthleteRoutine(ATHLETE_ID), {
      wrapper: wrapperFor(queryClient()),
    })

    expect(result.current.fetchStatus).toBe('idle')
    expect(getAthleteRoutine).not.toHaveBeenCalled()
  })

  it('no pide la rutina sin atleta', () => {
    saveSession(session('ATHLETE'))

    const { result } = renderHook(() => useAthleteRoutine(''), {
      wrapper: wrapperFor(queryClient()),
    })

    expect(result.current.fetchStatus).toBe('idle')
    expect(getAthleteRoutine).not.toHaveBeenCalled()
  })
})
