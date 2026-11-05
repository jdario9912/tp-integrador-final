import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError, get } from '../../../lib/api'
import { exercisesPage } from '../../../test/exercise-fixtures'
import { getExercises } from './get-exercises'

vi.mock('../../../lib/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../lib/api')>()),
  get: vi.fn(),
}))

beforeEach(() => {
  vi.mocked(get).mockReset()
})

describe('getExercises', () => {
  it('pide GET /exercises con la página en base 0 y devuelve la página', async () => {
    const page = exercisesPage()
    vi.mocked(get).mockResolvedValue(page)

    await expect(getExercises({ page: 2 })).resolves.toBe(page)
    expect(get).toHaveBeenCalledWith('/exercises', {
      params: { page: 1, size: 20, name: undefined, muscleGroup: undefined },
    })
  })

  it('envía el nombre sin espacios de más y el grupo muscular', async () => {
    vi.mocked(get).mockResolvedValue(exercisesPage())

    await getExercises({ page: 1, name: '  press ', muscleGroup: 'CHEST' })

    expect(get).toHaveBeenCalledWith('/exercises', {
      params: { page: 0, size: 20, name: 'press', muscleGroup: 'CHEST' },
    })
  })

  it('omite el nombre en blanco', async () => {
    vi.mocked(get).mockResolvedValue(exercisesPage())

    await getExercises({ page: 1, name: '   ' })

    expect(get).toHaveBeenCalledWith('/exercises', {
      params: { page: 0, size: 20, name: undefined, muscleGroup: undefined },
    })
  })

  it('propaga el ApiError', async () => {
    const error = new ApiError('No tiene permisos', 403)
    vi.mocked(get).mockRejectedValue(error)

    await expect(getExercises({ page: 1 })).rejects.toBe(error)
  })
})
