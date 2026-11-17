import type { DailyNutritionSummary } from '../pages/meals/types'

// resumen de un día con la forma de GET /athletes/{athleteId}/meals/summary (US-24, contrato 31)
export const dailySummary = (
  overrides: Partial<DailyNutritionSummary> = {},
): DailyNutritionSummary => ({
  date: '2026-11-13',
  caloriesKcal: 507.5,
  proteinG: 46.5,
  carbsG: 56,
  fatG: 6,
  mealCount: 2,
  mealsWithoutNutrition: 0,
  ...overrides,
})

// día sin comidas: la API responde 200 con todo en 0 (no 404)
export const emptyDailySummary = (date = '2026-11-13') =>
  dailySummary({
    date,
    caloriesKcal: 0,
    proteinG: 0,
    carbsG: 0,
    fatG: 0,
    mealCount: 0,
    mealsWithoutNutrition: 0,
  })
