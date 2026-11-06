import { beforeEach, describe, expect, it, vi } from 'vitest'
import { post } from '../../../lib/api'
import { createdRoutine } from '../../../test/routine-fixtures'
import { createRoutine } from './create-routine'

vi.mock('../../../lib/api', () => ({ post: vi.fn() }))

beforeEach(() => {
  vi.mocked(post).mockReset()
})

describe('createRoutine', () => {
  it('envía el input a POST /routines y devuelve la rutina creada', async () => {
    const input = {
      name: 'Fase de volumen',
      description: null,
      goal: 'Hipertrofia',
      daysPerWeek: 4,
      durationWeeks: null,
      isTemplate: false,
    }
    const routine = createdRoutine(input)
    vi.mocked(post).mockResolvedValue(routine)

    await expect(createRoutine(input)).resolves.toBe(routine)
    expect(post).toHaveBeenCalledWith('/routines', input)
  })
})
