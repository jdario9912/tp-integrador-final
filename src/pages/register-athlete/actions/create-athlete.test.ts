import { beforeEach, describe, expect, it, vi } from 'vitest'
import { post } from '../../../lib/api'
import { createdAthlete } from '../../../test/athlete-fixtures'
import { createAthlete } from './create-athlete'

vi.mock('../../../lib/api', () => ({ post: vi.fn() }))

beforeEach(() => {
  vi.mocked(post).mockReset()
})

describe('createAthlete', () => {
  it('envía el input a POST /athletes y devuelve el atleta creado', async () => {
    const input = {
      firstName: 'Juana',
      lastName: 'Pérez',
      email: 'juana@example.com',
      password: '12345678',
    }
    const athlete = createdAthlete()
    vi.mocked(post).mockResolvedValue(athlete)

    await expect(createAthlete(input)).resolves.toBe(athlete)
    expect(post).toHaveBeenCalledWith('/athletes', input)
  })
})
