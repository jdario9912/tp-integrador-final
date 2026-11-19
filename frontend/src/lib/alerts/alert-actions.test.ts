import { beforeEach, describe, expect, it, vi } from 'vitest'
import { get, patch } from '../api'
import { alert } from '../../test/alert-fixtures'
import { getAlerts } from './get-alerts'
import { handleAlert } from './handle-alert'

vi.mock('../api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../api')>()),
  get: vi.fn(),
  patch: vi.fn(),
}))

beforeEach(() => {
  vi.mocked(get).mockReset()
  vi.mocked(patch).mockReset()
})

describe('acciones de alertas (US-47)', () => {
  it('getAlerts pide GET /alerts y devuelve la lista tal cual', async () => {
    const alerts = [alert()]
    vi.mocked(get).mockResolvedValue(alerts)

    await expect(getAlerts()).resolves.toBe(alerts)
    expect(get).toHaveBeenCalledWith('/alerts')
  })

  it('handleAlert pide PATCH /alerts/{id}/handle sin body', async () => {
    const handled = alert({ handledAt: '2026-11-15T10:00:00Z' })
    vi.mocked(patch).mockResolvedValue(handled)

    await expect(handleAlert(handled.id)).resolves.toBe(handled)
    expect(patch).toHaveBeenCalledWith(
      `/alerts/${handled.id}/handle`,
      undefined,
    )
  })
})
