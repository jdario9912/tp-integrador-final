import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../../../lib/api'
import { saveSession } from '../../../lib/auth'
import { getWeights } from '../../../lib/weights/get-weights'
import { session } from '../../../test/auth-fixtures'
import { weightRecord, weightsPage } from '../../../test/weight-fixtures'
import { useWeightEvolution } from './use-weight-evolution'

vi.mock('../../../lib/weights/get-weights', () => ({ getWeights: vi.fn() }))

const ATHLETE_ID = session('ATHLETE').user.id

const queryClient = () =>
  new QueryClient({ defaultOptions: { queries: { retry: false } } })

const wrapperFor =
  (client: QueryClient) =>
  ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  )

// una página de N registros diarios desde el 1 de noviembre, la de `page` del total dado
const pageOf = (page: number, totalPages: number, days: number[]) =>
  weightsPage(
    days.map((day) =>
      weightRecord({
        id: `00000000-0000-4000-8000-${String(day).padStart(12, '0')}`,
        date: `2026-11-${String(day).padStart(2, '0')}`,
        weightKg: 70 + day / 10,
      }),
    ),
    {
      page,
      size: 2,
      totalElements: totalPages * 2,
      totalPages,
    },
  )

beforeEach(() => {
  vi.mocked(getWeights).mockReset()
  saveSession(session('ATHLETE'))
})

describe('useWeightEvolution', () => {
  it('trae todas las páginas del rango y las entrega de la más antigua a la más nueva', async () => {
    // el backend devuelve de más nueva a más antigua; el gráfico necesita el orden inverso
    vi.mocked(getWeights)
      .mockResolvedValueOnce(pageOf(0, 2, [6, 5]))
      .mockResolvedValueOnce(pageOf(1, 2, [4, 3]))

    const { result } = renderHook(
      () =>
        useWeightEvolution(ATHLETE_ID, {
          from: '2026-11-01',
          to: '2026-11-06',
        }),
      { wrapper: wrapperFor(queryClient()) },
    )

    await waitFor(() => expect(result.current.isPending).toBe(false))
    expect(result.current.points?.map(({ date }) => date)).toEqual([
      '2026-11-03',
      '2026-11-04',
      '2026-11-05',
      '2026-11-06',
    ])
    expect(getWeights).toHaveBeenNthCalledWith(1, ATHLETE_ID, {
      from: '2026-11-01',
      to: '2026-11-06',
      page: 0,
      size: 100,
    })
    expect(getWeights).toHaveBeenNthCalledWith(2, ATHLETE_ID, {
      from: '2026-11-01',
      to: '2026-11-06',
      page: 1,
      size: 100,
    })
  })

  it('sin rango pide todo sin fechas', async () => {
    vi.mocked(getWeights).mockResolvedValue(pageOf(0, 1, [2]))

    const { result } = renderHook(() => useWeightEvolution(ATHLETE_ID, {}), {
      wrapper: wrapperFor(queryClient()),
    })

    await waitFor(() => expect(result.current.points).toHaveLength(1))
    expect(getWeights).toHaveBeenCalledWith(ATHLETE_ID, {
      from: undefined,
      to: undefined,
      page: 0,
      size: 100,
    })
  })

  it('con un rango inválido (null) no pide nada', () => {
    const { result } = renderHook(() => useWeightEvolution(ATHLETE_ID, null), {
      wrapper: wrapperFor(queryClient()),
    })

    expect(getWeights).not.toHaveBeenCalled()
    expect(result.current.points).toBeUndefined()
  })

  it('sin registros en el rango, la lista llega vacía (no es un error)', async () => {
    vi.mocked(getWeights).mockResolvedValue(weightsPage([]))

    const { result } = renderHook(
      () =>
        useWeightEvolution(ATHLETE_ID, {
          from: '2026-01-01',
          to: '2026-01-31',
        }),
      { wrapper: wrapperFor(queryClient()) },
    )

    await waitFor(() => expect(result.current.points).toEqual([]))
    expect(result.current.error).toBeNull()
  })

  it('si una página falla, se detiene y muestra el error sin reintentar en bucle', async () => {
    const failure = new ApiError('Algo pasó', 500)
    vi.mocked(getWeights)
      .mockResolvedValueOnce(pageOf(0, 3, [6, 5]))
      .mockRejectedValue(failure)

    const { result } = renderHook(() => useWeightEvolution(ATHLETE_ID, {}), {
      wrapper: wrapperFor(queryClient()),
    })

    await waitFor(() => expect(result.current.error).toBe(failure))
    // la primera página más el único intento de la segunda
    expect(getWeights).toHaveBeenCalledTimes(2)
    expect(result.current.isPending).toBe(false)
  })

  it('un 400 llega tal cual para mostrar el mensaje del backend', async () => {
    const badRequest = new ApiError(
      'La solicitud tiene campos inválidos',
      400,
      {
        fieldErrors: [
          {
            field: 'from',
            message: 'La fecha desde no puede ser posterior a la fecha hasta',
          },
        ],
      },
    )
    vi.mocked(getWeights).mockRejectedValue(badRequest)

    const { result } = renderHook(
      () =>
        useWeightEvolution(ATHLETE_ID, {
          from: '2026-11-02',
          to: '2026-11-01',
        }),
      { wrapper: wrapperFor(queryClient()) },
    )

    await waitFor(() => expect(result.current.error).toBe(badRequest))
    expect(result.current.points).toBeUndefined()
  })
})
