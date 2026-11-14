import type { Meal, MealItem } from '../lib/meals'

// ítem con la forma de la comida (contrato de US-23, 11.2); por defecto, pechuga de pollo
export const mealItem = (overrides: Partial<MealItem> = {}): MealItem => ({
  id: 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d',
  foodId: '0b1c2d3e-4f5a-4b6c-9d7e-8f9a0b1c2d3e',
  foodName: 'Pechuga de pollo cocida',
  quantityG: 150,
  caloriesKcal: 247.5,
  proteinG: 46.5,
  carbsG: 0,
  fatG: 5.4,
  ...overrides,
})

// comida del día con la forma que devuelve GET /athletes/{athleteId}/meals (ejemplo 11.2)
export const meal = (overrides: Partial<Meal> = {}): Meal => ({
  id: '7d8e9f0a-1b2c-4d3e-8f4a-5b6c7d8e9f0a',
  date: '2026-11-13',
  type: 'LUNCH',
  description: null,
  totalCaloriesKcal: 247.5,
  items: [mealItem()],
  createdAt: '2026-11-13T16:40:12.345678Z',
  updatedAt: '2026-11-13T16:40:12.345678Z',
  ...overrides,
})
