import { beforeEach, describe, expect, it, vi } from 'vitest'
import { post } from '../../../lib/api'
import { requestPasswordRecovery } from './request-password-recovery'

vi.mock('../../../lib/api', () => ({ post: vi.fn() }))

beforeEach(() => {
  vi.mocked(post).mockReset()
})

describe('requestPasswordRecovery (US-44)', () => {
  it('envía el email a POST /auth/password-recovery', async () => {
    vi.mocked(post).mockResolvedValue(undefined)

    await requestPasswordRecovery({ email: 'ana@example.com' })

    expect(post).toHaveBeenCalledWith('/auth/password-recovery', {
      email: 'ana@example.com',
    })
  })
})
