import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError, get } from '../../../lib/api'
import { foodsPage } from '../../../test/food-fixtures'
import { getFoods } from './get-foods'

vi.mock('../../../lib/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../lib/api')>()),
  get: vi.fn(),
}))

beforeEach(() => {
  vi.mocked(get).mockReset()
})

describe('getFoods', () => {
  it('pide GET /foods con la página en base 0 y devuelve la página', async () => {
    const page = foodsPage()
    vi.mocked(get).mockResolvedValue(page)

    await expect(getFoods({ page: 2 })).resolves.toBe(page)
    expect(get).toHaveBeenCalledWith('/foods', {
      params: { page: 1, size: 20, name: undefined },
    })
  })

  it('envía el nombre sin espacios de más', async () => {
    vi.mocked(get).mockResolvedValue(foodsPage())

    await getFoods({ page: 1, name: '  pollo ' })

    expect(get).toHaveBeenCalledWith('/foods', {
      params: { page: 0, size: 20, name: 'pollo' },
    })
  })

  it('omite el nombre en blanco', async () => {
    vi.mocked(get).mockResolvedValue(foodsPage())

    await getFoods({ page: 1, name: '   ' })

    expect(get).toHaveBeenCalledWith('/foods', {
      params: { page: 0, size: 20, name: undefined },
    })
  })

  it('propaga el ApiError', async () => {
    const error = new ApiError('Ocurrió un error inesperado', 500)
    vi.mocked(get).mockRejectedValue(error)

    await expect(getFoods({ page: 1 })).rejects.toBe(error)
  })
})
