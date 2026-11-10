import { beforeEach, describe, expect, it, vi } from 'vitest'
import { get, put } from '../../../lib/api'
import { exercisesPage } from '../../../test/exercise-fixtures'
import { routineDetail } from '../../../test/routine-fixtures'
import { saveRoutineStructure } from './save-routine-structure'
import { searchExercises } from './search-exercises'

vi.mock('../../../lib/api', () => ({ get: vi.fn(), put: vi.fn() }))

beforeEach(() => {
  vi.mocked(get).mockReset()
  vi.mocked(put).mockReset()
})

describe('acciones de la estructura', () => {
  it('saveRoutineStructure envía los días a PUT /routines/{id}/days', async () => {
    const input = {
      days: [
        {
          id: 'd1',
          name: 'Empuje',
          exercises: [
            {
              exerciseId: 'e1',
              sets: 4,
              reps: 10,
              recommendedWeight: null,
              rest: 90,
              rirRpe: null,
              techniqueNote: null,
            },
          ],
        },
      ],
    }
    const routine = routineDetail()
    vi.mocked(put).mockResolvedValue(routine)

    await expect(saveRoutineStructure('abc', input)).resolves.toBe(routine)
    expect(put).toHaveBeenCalledWith('/routines/abc/days', input)
  })

  it('searchExercises pide la primera página filtrada por nombre y grupo', async () => {
    const page = exercisesPage()
    vi.mocked(get).mockResolvedValue(page)

    await expect(
      searchExercises({ name: ' press ', muscleGroup: 'CHEST' }),
    ).resolves.toBe(page)
    expect(get).toHaveBeenCalledWith('/exercises', {
      params: { page: 0, size: 20, name: 'press', muscleGroup: 'CHEST' },
    })
  })

  it('searchExercises no envía un nombre en blanco', async () => {
    vi.mocked(get).mockResolvedValue(exercisesPage())

    await searchExercises({ name: '  ' })
    expect(get).toHaveBeenCalledWith('/exercises', {
      params: { page: 0, size: 20, name: undefined, muscleGroup: undefined },
    })
  })
})
