import { beforeEach, describe, expect, it, vi } from 'vitest'
import { put } from '../../../lib/api'
import { routineDetail } from '../../../test/routine-fixtures'
import { updateRoutine } from './update-routine'

vi.mock('../../../lib/api', () => ({ put: vi.fn() }))

beforeEach(() => {
  vi.mocked(put).mockReset()
})

describe('updateRoutine', () => {
  it('envía el input a PUT /routines/{id} y devuelve la rutina', async () => {
    const input = {
      name: 'Fase de volumen II',
      description: null,
      goal: 'Hipertrofia',
      daysPerWeek: 4,
      durationWeeks: null,
      isTemplate: false,
    }
    const routine = routineDetail(input)
    vi.mocked(put).mockResolvedValue(routine)

    await expect(updateRoutine('abc', input)).resolves.toBe(routine)
    expect(put).toHaveBeenCalledWith('/routines/abc', input)
  })
})
