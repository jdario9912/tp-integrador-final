import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../api'
import { saveSession } from '../auth'
import { session } from '../../test/auth-fixtures'
import { weightRecord } from '../../test/weight-fixtures'
import { createWeight } from './create-weight'
import { updateWeight } from './update-weight'
import { useCreateWeight } from './use-create-weight'
import { useUpdateWeight } from './use-update-weight'
import { athleteWeightsKey } from './use-weights'

vi.mock('./create-weight', () => ({ createWeight: vi.fn() }))
vi.mock('./update-weight', () => ({ updateWeight: vi.fn() }))

const athlete = session('ATHLETE')
const ATHLETE_ID = athlete.user.id
const input = { date: '2026-11-06', weightKg: 72.5, comment: null }

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
  vi.mocked(createWeight).mockReset()
  vi.mocked(updateWeight).mockReset()
  saveSession(athlete)
})

describe('useCreateWeight', () => {
  it('crea el registro e invalida todos los registros del atleta', async () => {
    const record = weightRecord()
    vi.mocked(createWeight).mockResolvedValue(record)
    const { result, invalidate } = setup(() => useCreateWeight(ATHLETE_ID))

    await act(async () => {
      await expect(result.current.mutateAsync(input)).resolves.toBe(record)
    })

    expect(createWeight).toHaveBeenCalledWith(ATHLETE_ID, input)
    expect(invalidate).toHaveBeenCalledWith({
      queryKey: athleteWeightsKey(ATHLETE_ID, ATHLETE_ID),
    })
  })

  it('si falla no invalida y propaga el error', async () => {
    const error = new ApiError(
      'Ya existe un registro de peso para el 06/11/2026',
      409,
    )
    vi.mocked(createWeight).mockRejectedValue(error)
    const { result, invalidate } = setup(() => useCreateWeight(ATHLETE_ID))

    await act(async () => {
      await expect(result.current.mutateAsync(input)).rejects.toBe(error)
    })

    expect(invalidate).not.toHaveBeenCalled()
  })
})

describe('useUpdateWeight', () => {
  it('edita el registro e invalida todos los registros del atleta', async () => {
    const record = weightRecord()
    vi.mocked(updateWeight).mockResolvedValue(record)
    const { result, invalidate } = setup(() => useUpdateWeight(ATHLETE_ID))

    await act(async () => {
      await expect(
        result.current.mutateAsync({ weightId: record.id, input }),
      ).resolves.toBe(record)
    })

    expect(updateWeight).toHaveBeenCalledWith(ATHLETE_ID, record.id, input)
    expect(invalidate).toHaveBeenCalledWith({
      queryKey: athleteWeightsKey(ATHLETE_ID, ATHLETE_ID),
    })
  })

  it('si falla no invalida y propaga el error', async () => {
    const error = new ApiError('No existe el registro de peso con id x', 404)
    vi.mocked(updateWeight).mockRejectedValue(error)
    const { result, invalidate } = setup(() => useUpdateWeight(ATHLETE_ID))

    await act(async () => {
      await expect(
        result.current.mutateAsync({ weightId: 'x', input }),
      ).rejects.toBe(error)
    })

    expect(invalidate).not.toHaveBeenCalled()
  })
})
