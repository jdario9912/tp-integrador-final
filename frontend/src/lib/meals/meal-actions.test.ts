import { beforeEach, describe, expect, it, vi } from 'vitest'
import { del, get, post, put } from '../api'
import { meal } from '../../test/meal-fixtures'
import { createMeal } from './create-meal'
import { deleteMeal } from './delete-meal'
import { getMealsOfDay } from './get-meals'
import { putMealReview } from './put-meal-review'
import type { MealInput } from './types'
import { updateMeal } from './update-meal'

vi.mock('../api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../api')>()),
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  del: vi.fn(),
}))

const ATHLETE_ID = '0a6d2b9e-7c51-4c1e-9d3f-2b8e5f6a7c10'
const MEAL_ID = '7d8e9f0a-1b2c-4d3e-8f4a-5b6c7d8e9f0a'
const input: MealInput = {
  date: '2026-11-13',
  type: 'LUNCH',
  description: null,
  items: [{ foodId: '0b1c2d3e-4f5a-4b6c-9d7e-8f9a0b1c2d3e', quantityG: 150 }],
}

beforeEach(() => {
  vi.mocked(get).mockReset()
  vi.mocked(post).mockReset()
  vi.mocked(put).mockReset()
  vi.mocked(del).mockReset()
})

describe('acciones de las comidas', () => {
  it('getMealsOfDay pide la lista del día con la fecha explícita', async () => {
    vi.mocked(get).mockResolvedValue([meal()])

    await getMealsOfDay(ATHLETE_ID, '2026-11-13')

    expect(get).toHaveBeenCalledWith(`/athletes/${ATHLETE_ID}/meals`, {
      params: { date: '2026-11-13' },
    })
  })

  it('createMeal envía el body a POST /athletes/{athleteId}/meals', async () => {
    vi.mocked(post).mockResolvedValue(meal())

    await createMeal(ATHLETE_ID, input)

    expect(post).toHaveBeenCalledWith(`/athletes/${ATHLETE_ID}/meals`, input)
  })

  it('updateMeal envía el body completo a PUT /athletes/{athleteId}/meals/{mealId}', async () => {
    vi.mocked(put).mockResolvedValue(meal())

    await updateMeal(ATHLETE_ID, MEAL_ID, input)

    expect(put).toHaveBeenCalledWith(
      `/athletes/${ATHLETE_ID}/meals/${MEAL_ID}`,
      input,
    )
  })

  it('deleteMeal llama a DELETE /athletes/{athleteId}/meals/{mealId}', async () => {
    vi.mocked(del).mockResolvedValue(undefined)

    await deleteMeal(ATHLETE_ID, MEAL_ID)

    expect(del).toHaveBeenCalledWith(`/athletes/${ATHLETE_ID}/meals/${MEAL_ID}`)
  })

  it('putMealReview envía el comentario a PUT /athletes/{athleteId}/meals/{mealId}/review (US-25)', async () => {
    vi.mocked(put).mockResolvedValue(meal())

    await putMealReview(ATHLETE_ID, MEAL_ID, { observation: 'Bien' })

    expect(put).toHaveBeenCalledWith(
      `/athletes/${ATHLETE_ID}/meals/${MEAL_ID}/review`,
      { observation: 'Bien' },
    )
  })
})
