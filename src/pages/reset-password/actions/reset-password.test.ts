import { beforeEach, describe, expect, it, vi } from 'vitest'
import { post } from '../../../lib/api'
import { resetPassword } from './reset-password'

vi.mock('../../../lib/api', () => ({ post: vi.fn() }))

beforeEach(() => {
  vi.mocked(post).mockReset()
})

describe('resetPassword (US-44)', () => {
  it('envía el token y la contraseña nueva a POST /auth/password-reset', async () => {
    vi.mocked(post).mockResolvedValue(undefined)
    const input = { token: 'token-1', newPassword: 'nueva-clave' }

    await resetPassword(input)

    expect(post).toHaveBeenCalledWith('/auth/password-reset', input)
  })
})
