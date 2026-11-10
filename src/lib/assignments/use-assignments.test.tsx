import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { saveSession } from '../auth'
import { session } from '../../test/auth-fixtures'
import {
  assignmentsPage,
  routineAssignment,
} from '../../test/assignment-fixtures'
import { getAssignments } from './get-assignments'
import { athleteAssignmentsKey, useAssignments } from './use-assignments'

vi.mock('./get-assignments', () => ({ getAssignments: vi.fn() }))

const ATHLETE_ID = '3f1c2a9e-8b7d-4c1e-9a2b-5d6e7f8a9b0c'
const OTHER_ATHLETE_ID = '7d1f3c2a-5b6e-4f80-9a1b-2c3d4e5f6a7b'

const queryClient = () =>
  new QueryClient({ defaultOptions: { queries: { retry: false } } })

const wrapperFor =
  (client: QueryClient) =>
  ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  )

beforeEach(() => {
  vi.mocked(getAssignments).mockReset()
})

describe('useAssignments', () => {
  it('pide el historial del atleta y lo guarda bajo su clave con los parámetros', async () => {
    const coach = session('COACH')
    saveSession(coach)
    const page = assignmentsPage()
    vi.mocked(getAssignments).mockResolvedValue(page)
    const client = queryClient()

    const { result } = renderHook(
      () => useAssignments(ATHLETE_ID, { page: 0, size: 10 }),
      { wrapper: wrapperFor(client) },
    )

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(getAssignments).toHaveBeenCalledWith(ATHLETE_ID, {
      page: 0,
      size: 10,
    })
    expect(
      client.getQueryData([
        ...athleteAssignmentsKey(coach.user.id, ATHLETE_ID),
        { page: 0, size: 10 },
      ]),
    ).toBe(page)
  })

  it('la clave agrupa todo el historial del atleta y no cuelga de los atletas', () => {
    expect(athleteAssignmentsKey('u1', 'a1')).toEqual([
      'assignments',
      'u1',
      'a1',
    ])
  })

  it('al paginar mantiene la página anterior, pero no la de otro atleta', async () => {
    saveSession(session('COACH'))
    const first = assignmentsPage([routineAssignment()])
    vi.mocked(getAssignments).mockImplementation(async (athleteId, query) =>
      athleteId === ATHLETE_ID && query?.page === 0
        ? first
        : new Promise(() => {}),
    )
    const { result, rerender } = renderHook(
      ({ athleteId, page }) => useAssignments(athleteId, { page, size: 10 }),
      {
        wrapper: wrapperFor(queryClient()),
        initialProps: { athleteId: ATHLETE_ID, page: 0 },
      },
    )
    await waitFor(() => expect(result.current.data).toBe(first))

    rerender({ athleteId: ATHLETE_ID, page: 1 })
    expect(result.current.data).toBe(first)
    expect(result.current.isPlaceholderData).toBe(true)

    rerender({ athleteId: OTHER_ATHLETE_ID, page: 1 })
    expect(result.current.data).toBeUndefined()
  })

  it('no pide el historial sin sesión', () => {
    const { result } = renderHook(() => useAssignments(ATHLETE_ID), {
      wrapper: wrapperFor(queryClient()),
    })

    expect(result.current.fetchStatus).toBe('idle')
    expect(getAssignments).not.toHaveBeenCalled()
  })

  it('no pide el historial sin atleta', () => {
    saveSession(session('COACH'))

    const { result } = renderHook(() => useAssignments(''), {
      wrapper: wrapperFor(queryClient()),
    })

    expect(result.current.fetchStatus).toBe('idle')
    expect(getAssignments).not.toHaveBeenCalled()
  })
})
