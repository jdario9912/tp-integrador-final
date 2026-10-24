import { beforeEach, describe, expect, it, vi } from 'vitest'
import { post } from '../api'
import { logout } from './logout'

vi.mock('../api', () => ({ post: vi.fn() }))

beforeEach(() => {
  vi.mocked(post).mockReset()
})

describe('logout', () => {
  it('envía POST /auth/logout sin body', async () => {
    vi.mocked(post).mockResolvedValue(undefined)

    await expect(logout()).resolves.toBeUndefined()
    expect(post).toHaveBeenCalledWith('/auth/logout', undefined)
  })
})
