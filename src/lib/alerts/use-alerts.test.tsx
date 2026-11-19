import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../api'
import { saveSession } from '../auth'
import { alert } from '../../test/alert-fixtures'
import { session } from '../../test/auth-fixtures'
import { getAlerts } from './get-alerts'
import { handleAlert } from './handle-alert'
import { alertsKey, useAlerts } from './use-alerts'
import { useHandleAlert } from './use-handle-alert'

vi.mock('./get-alerts', () => ({ getAlerts: vi.fn() }))
vi.mock('./handle-alert', () => ({ handleAlert: vi.fn() }))

const setup = <T,>(useHook: () => T) => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  const invalidate = vi.spyOn(client, 'invalidateQueries')
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  )
  return { client, invalidate, ...renderHook(useHook, { wrapper }) }
}

beforeEach(() => {
  vi.mocked(getAlerts).mockReset()
  vi.mocked(handleAlert).mockReset()
})

describe('useAlerts (US-47)', () => {
  it('pide las alertas y las guarda bajo la clave del entrenador', async () => {
    const coach = session('COACH')
    saveSession(coach)
    const alerts = [alert()]
    vi.mocked(getAlerts).mockResolvedValue(alerts)

    const { client, result } = setup(() => useAlerts())

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(client.getQueryData(alertsKey(coach.user.id))).toBe(alerts)
  })

  it('no las pide sin sesión ni para un atleta', () => {
    const { result } = setup(() => useAlerts())
    expect(result.current.fetchStatus).toBe('idle')

    saveSession(session('ATHLETE'))
    const athlete = setup(() => useAlerts())
    expect(athlete.result.current.fetchStatus).toBe('idle')
    expect(getAlerts).not.toHaveBeenCalled()
  })
})

describe('useHandleAlert (US-47)', () => {
  it('atiende la alerta y refresca la lista', async () => {
    const coach = session('COACH')
    saveSession(coach)
    vi.mocked(handleAlert).mockResolvedValue(
      alert({ handledAt: '2026-11-15T10:00:00Z' }),
    )

    const { invalidate, result } = setup(() => useHandleAlert())
    await act(() => result.current.mutateAsync('alerta-1'))

    expect(vi.mocked(handleAlert).mock.calls[0][0]).toBe('alerta-1')
    expect(invalidate).toHaveBeenCalledWith({
      queryKey: alertsKey(coach.user.id),
    })
  })

  it.each([
    [409, 'La alerta ya fue atendida'],
    [403, 'No tiene permisos sobre esta alerta'],
    [404, 'La alerta no existe'],
  ])('con un %i también refresca la lista', async (status, message) => {
    const coach = session('COACH')
    saveSession(coach)
    vi.mocked(handleAlert).mockRejectedValue(new ApiError(message, status))

    const { invalidate, result } = setup(() => useHandleAlert())
    await act(() =>
      result.current.mutateAsync('alerta-1').catch(() => undefined),
    )

    expect(invalidate).toHaveBeenCalledWith({
      queryKey: alertsKey(coach.user.id),
    })
  })
})
