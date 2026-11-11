import { beforeEach, describe, expect, it, vi } from 'vitest'
import { post } from '../../../lib/api'
import { createdFood } from '../../../test/food-fixtures'
import { createFood } from './create-food'

vi.mock('../../../lib/api', () => ({ post: vi.fn() }))

beforeEach(() => {
  vi.mocked(post).mockReset()
})

describe('createFood', () => {
  it('envía el input a POST /foods y devuelve el alimento creado', async () => {
    const { id: _id, ...input } = createdFood()
    const food = createdFood()
    vi.mocked(post).mockResolvedValue(food)

    await expect(createFood(input)).resolves.toBe(food)
    expect(post).toHaveBeenCalledWith('/foods', input)
  })
})
