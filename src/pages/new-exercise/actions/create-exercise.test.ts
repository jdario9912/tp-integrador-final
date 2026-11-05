import { beforeEach, describe, expect, it, vi } from 'vitest'
import { post } from '../../../lib/api'
import { createdExercise } from '../../../test/exercise-fixtures'
import { createExercise } from './create-exercise'

vi.mock('../../../lib/api', () => ({ post: vi.fn() }))

beforeEach(() => {
  vi.mocked(post).mockReset()
})

describe('createExercise', () => {
  it('envía el input a POST /exercises y devuelve el ejercicio creado', async () => {
    const input = {
      name: 'Press de banca',
      muscleGroup: 'CHEST' as const,
      description: null,
      videoUrl: null,
    }
    const exercise = createdExercise()
    vi.mocked(post).mockResolvedValue(exercise)

    await expect(createExercise(input)).resolves.toBe(exercise)
    expect(post).toHaveBeenCalledWith('/exercises', input)
  })
})
