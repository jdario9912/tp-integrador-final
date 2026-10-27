import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError, get } from '../../../lib/api'
import { athletesPage } from '../../../test/athlete-fixtures'
import { getAthletes } from './get-athletes'

vi.mock('../../../lib/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../lib/api')>()),
  get: vi.fn(),
}))

beforeEach(() => {
  vi.mocked(get).mockReset()
})

describe('getAthletes', () => {
  it('pide GET /athletes con la página en base 0 y devuelve la página', async () => {
    const page = athletesPage()
    vi.mocked(get).mockResolvedValue(page)

    await expect(getAthletes({ page: 2 })).resolves.toBe(page)
    expect(get).toHaveBeenCalledWith('/athletes', {
      params: { page: 1, size: 20, name: undefined, goal: undefined },
    })
  })

  it('envía los filtros sin espacios de más', async () => {
    vi.mocked(get).mockResolvedValue(athletesPage())

    await getAthletes({ page: 1, name: '  Juana ', goal: ' fuerza ' })

    expect(get).toHaveBeenCalledWith('/athletes', {
      params: { page: 0, size: 20, name: 'Juana', goal: 'fuerza' },
    })
  })

  it('omite los filtros vacíos o en blanco', async () => {
    vi.mocked(get).mockResolvedValue(athletesPage())

    await getAthletes({ page: 1, name: '', goal: '   ' })

    expect(get).toHaveBeenCalledWith('/athletes', {
      params: { page: 0, size: 20, name: undefined, goal: undefined },
    })
  })

  it('propaga el ApiError', async () => {
    const error = new ApiError('No tiene permisos', 403)
    vi.mocked(get).mockRejectedValue(error)

    await expect(getAthletes({ page: 1 })).rejects.toBe(error)
  })
})
