import { beforeEach, describe, expect, it, vi } from 'vitest'
import { del, get, put } from '../../../lib/api'
import { createdExercise } from '../../../test/exercise-fixtures'
import { deleteExercise } from './delete-exercise'
import { getExercise } from './get-exercise'
import { updateExercise } from './update-exercise'

vi.mock('../../../lib/api', () => ({
  get: vi.fn(),
  put: vi.fn(),
  del: vi.fn(),
}))

beforeEach(() => {
  vi.mocked(get).mockReset()
  vi.mocked(put).mockReset()
  vi.mocked(del).mockReset()
})

describe('acciones del ejercicio', () => {
  it('getExercise pide GET /exercises/{id}', async () => {
    const exercise = createdExercise()
    vi.mocked(get).mockResolvedValue(exercise)

    await expect(getExercise('abc')).resolves.toBe(exercise)
    expect(get).toHaveBeenCalledWith('/exercises/abc')
  })

  it('updateExercise envía el input a PUT /exercises/{id}', async () => {
    const input = {
      name: 'Press inclinado',
      muscleGroup: 'CHEST' as const,
      description: null,
      videoUrl: null,
    }
    vi.mocked(put).mockResolvedValue(createdExercise(input))

    await updateExercise('abc', input)
    expect(put).toHaveBeenCalledWith('/exercises/abc', input)
  })

  it('deleteExercise pide DELETE /exercises/{id}', async () => {
    vi.mocked(del).mockResolvedValue(undefined)

    await deleteExercise('abc')
    expect(del).toHaveBeenCalledWith('/exercises/abc')
  })
})
