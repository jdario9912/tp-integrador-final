import { beforeEach, describe, expect, it, vi } from 'vitest'
import { post } from '../../../lib/api'
import { authResponse } from '../../../test/auth-fixtures'
import { login } from './login'

vi.mock('../../../lib/api', () => ({ post: vi.fn() }))

beforeEach(() => {
  vi.mocked(post).mockReset()
})

describe('login', () => {
  it('envía las credenciales a POST /auth/login y devuelve la sesión', async () => {
    const input = { email: 'ana@example.com', password: '12345678' }
    vi.mocked(post).mockResolvedValue(authResponse())

    await expect(login(input)).resolves.toEqual(authResponse())
    expect(post).toHaveBeenCalledWith('/auth/login', input)
  })
})
