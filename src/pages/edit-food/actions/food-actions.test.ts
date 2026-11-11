import { beforeEach, describe, expect, it, vi } from 'vitest'
import { get, put } from '../../../lib/api'
import { createdFood } from '../../../test/food-fixtures'
import { getFood } from './get-food'
import { updateFood } from './update-food'

vi.mock('../../../lib/api', () => ({ get: vi.fn(), put: vi.fn() }))

beforeEach(() => {
  vi.mocked(get).mockReset()
  vi.mocked(put).mockReset()
})

describe('acciones del alimento', () => {
  it('getFood pide GET /foods/{id}', async () => {
    const food = createdFood()
    vi.mocked(get).mockResolvedValue(food)

    await expect(getFood('abc')).resolves.toBe(food)
    expect(get).toHaveBeenCalledWith('/foods/abc')
  })

  it('updateFood envía el input a PUT /foods/{id}', async () => {
    const { id: _id, ...input } = createdFood({ name: 'Manzana verde' })
    const food = createdFood(input)
    vi.mocked(put).mockResolvedValue(food)

    await expect(updateFood('abc', input)).resolves.toBe(food)
    expect(put).toHaveBeenCalledWith('/foods/abc', input)
  })
})
