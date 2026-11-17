import { get } from '../../../lib/api'
import type { DailyNutritionSummary } from '../types'

// GET /athletes/{athleteId}/meals/summary?date= (US-24): un día sin comidas responde 200 con todo en 0
export const getDailyNutritionSummary = (athleteId: string, date: string) =>
  get<DailyNutritionSummary>(`/athletes/${athleteId}/meals/summary`, {
    params: { date },
  })
