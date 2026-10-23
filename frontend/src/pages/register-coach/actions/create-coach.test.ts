import { beforeEach, describe, expect, it, vi } from 'vitest'
import { post } from '../../../lib/api'
import { createCoach } from './create-coach'

vi.mock('../../../lib/api', () => ({ post: vi.fn() }))

beforeEach(() => {
  vi.mocked(post).mockReset()
})

describe('createCoach', () => {
  it('envía el input a POST /coaches y devuelve el entrenador creado', async () => {
    const input = {
      firstName: 'Ana',
      lastName: 'Pérez',
      email: 'ana@example.com',
      password: '12345678',
    }
    const coach = {
      id: '1',
      ...input,
      phone: null,
      specialty: null,
      licenseNumber: null,
      bio: null,
      createdAt: '2026-10-21T17:16:57Z',
    }
    vi.mocked(post).mockResolvedValue(coach)

    await expect(createCoach(input)).resolves.toBe(coach)
    expect(post).toHaveBeenCalledWith('/coaches', input)
  })
})
