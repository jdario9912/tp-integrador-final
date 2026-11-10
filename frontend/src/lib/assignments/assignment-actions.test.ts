import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError, get, post } from '../api'
import {
  assignmentsPage,
  routineAssignment,
} from '../../test/assignment-fixtures'
import { assignRoutine } from './assign-routine'
import { getAssignments } from './get-assignments'

vi.mock('../api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../api')>()),
  get: vi.fn(),
  post: vi.fn(),
}))

const ATHLETE_ID = '3f1c2a9e-8b7d-4c1e-9a2b-5d6e7f8a9b0c'
const ROUTINE_ID = '7c9e6679-7425-40de-944b-e07fc1f90ae7'

beforeEach(() => {
  vi.mocked(get).mockReset()
  vi.mocked(post).mockReset()
})

describe('acciones de las asignaciones de rutina', () => {
  it('getAssignments pide GET /athletes/{athleteId}/assignments con la paginación', async () => {
    const page = assignmentsPage()
    vi.mocked(get).mockResolvedValue(page)

    await expect(
      getAssignments(ATHLETE_ID, { page: 1, size: 10 }),
    ).resolves.toBe(page)
    expect(get).toHaveBeenCalledWith(`/athletes/${ATHLETE_ID}/assignments`, {
      params: { page: 1, size: 10 },
    })
  })

  it('getAssignments sin query usa la paginación del backend', async () => {
    vi.mocked(get).mockResolvedValue(assignmentsPage([]))

    await getAssignments(ATHLETE_ID)
    expect(get).toHaveBeenCalledWith(`/athletes/${ATHLETE_ID}/assignments`, {
      params: {},
    })
  })

  it.each([false, true])(
    'assignRoutine envía routineId y replaceActive=%s a POST /athletes/{athleteId}/assignments',
    async (replaceActive) => {
      const assignment = routineAssignment()
      vi.mocked(post).mockResolvedValue(assignment)

      await expect(
        assignRoutine(ATHLETE_ID, { routineId: ROUTINE_ID, replaceActive }),
      ).resolves.toBe(assignment)
      expect(post).toHaveBeenCalledWith(`/athletes/${ATHLETE_ID}/assignments`, {
        routineId: ROUTINE_ID,
        replaceActive,
      })
    },
  )

  it('propaga el ApiError (por ejemplo, el 409 de la rutina activa)', async () => {
    const error = new ApiError(
      'El atleta ya tiene asignada la rutina «Fuerza». Confirme el reemplazo para asignar la nueva',
      409,
    )
    vi.mocked(post).mockRejectedValue(error)

    await expect(
      assignRoutine(ATHLETE_ID, {
        routineId: ROUTINE_ID,
        replaceActive: false,
      }),
    ).rejects.toBe(error)
  })
})
