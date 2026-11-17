import { get } from '../../../lib/api'
import type { NutritionOverview, NutritionRange } from '../types'

// GET /athletes/{athleteId}/meals/overview?from=&to= (US-25): el front manda siempre el rango
// explícito. 400 si from > to o si supera 31 días; 403 si el atleta es de otro entrenador
export const getNutritionOverview = (
  athleteId: string,
  { from, to }: NutritionRange,
) =>
  get<NutritionOverview>(`/athletes/${athleteId}/meals/overview`, {
    params: { from, to },
  })
