import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { saveSession } from '../auth'
import { session } from '../../test/auth-fixtures'
import {
  trainingHistoryItem,
  trainingSession,
} from '../../test/training-session-fixtures'
import { getTrainingHistory } from './get-training-history'
import { putSessionReview } from './put-session-review'
import {
  trainingHistoryKey,
  trainingHistoryQueryKey,
  trainingSessionKey,
} from './training-session-keys'
import { useSessionReview } from './use-session-review'
import { useTrainingHistory } from './use-training-history'

vi.mock('./get-training-history', () => ({ getTrainingHistory: vi.fn() }))
vi.mock('./put-session-review', () => ({ putSessionReview: vi.fn() }))

const ATHLETE = session('ATHLETE')
const ATHLETE_ID = ATHLETE.user.id
const SESSION_ID = '4f5a6b7c-8d9e-4f0a-8b1c-2d3e4f5a6b7c'

const wrapperFor = (client: QueryClient) =>
  function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>
  }

beforeEach(() => {
  vi.mocked(getTrainingHistory).mockReset()
  vi.mocked(putSessionReview).mockReset()
  saveSession(ATHLETE)
})

describe('useTrainingHistory', () => {
  it('pide la página con el filtro y la cachea por consulta', async () => {
    const page = {
      content: [trainingHistoryItem()],
      page: 0,
      size: 10,
      totalElements: 1,
      totalPages: 1,
    }
    vi.mocked(getTrainingHistory).mockResolvedValue(page)
    const client = new QueryClient()

    const { result } = renderHook(
      () => useTrainingHistory(ATHLETE_ID, { from: '2026-11-01', page: 0 }),
      { wrapper: wrapperFor(client) },
    )

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toBe(page)
    expect(getTrainingHistory).toHaveBeenCalledWith(ATHLETE_ID, {
      from: '2026-11-01',
      page: 0,
    })
    expect(
      client.getQueryData(
        trainingHistoryQueryKey(ATHLETE.user.id, ATHLETE_ID, {
          from: '2026-11-01',
          page: 0,
        }),
      ),
    ).toBe(page)
  })
})

describe('useSessionReview', () => {
  it('guarda la sesión revisada en el detalle e invalida el historial', async () => {
    const reviewed = trainingSession({
      status: 'FINISHED',
      review: { reviewedAt: '2026-11-14T20:00:00Z', observation: 'Bien' },
    })
    vi.mocked(putSessionReview).mockResolvedValue(reviewed)
    const client = new QueryClient({
      defaultOptions: { mutations: { retry: false } },
    })
    const invalidate = vi.spyOn(client, 'invalidateQueries')

    const { result } = renderHook(
      () => useSessionReview(ATHLETE_ID, SESSION_ID),
      { wrapper: wrapperFor(client) },
    )

    await act(async () => {
      await result.current.mutateAsync({ observation: 'Bien' })
    })

    expect(putSessionReview).toHaveBeenCalledWith(ATHLETE_ID, SESSION_ID, {
      observation: 'Bien',
    })
    expect(
      client.getQueryData(
        trainingSessionKey(ATHLETE.user.id, ATHLETE_ID, SESSION_ID),
      ),
    ).toBe(reviewed)
    expect(invalidate).toHaveBeenCalledWith({
      queryKey: trainingHistoryKey(ATHLETE.user.id, ATHLETE_ID),
    })
  })
})
