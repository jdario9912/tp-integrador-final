import { athleteMealsKey } from '../../lib/meals'
import type { NutritionRange } from './types'

// la alimentación por rango cuelga de la clave de las comidas del atleta: la revisión de una comida
// (y cualquier mutación de lib/meals) invalida ese prefijo, así la semana se vuelve a pedir junto
// con la lista del día
export const nutritionOverviewKey = (
  userId: string | undefined,
  athleteId: string,
  { from, to }: NutritionRange,
) => [...athleteMealsKey(userId, athleteId), 'overview', from, to]
