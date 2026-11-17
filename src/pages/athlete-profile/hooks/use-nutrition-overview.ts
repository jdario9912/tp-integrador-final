import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../../../lib/auth'
import { getNutritionOverview } from '../actions/get-nutrition-overview'
import { nutritionOverviewKey } from '../nutrition-overview-key'
import type { NutritionRange } from '../types'

// alimentación del atleta en un rango (US-25); el rango lo define la sección (la semana que se mira)
export const useNutritionOverview = (
  athleteId: string,
  range: NutritionRange,
) => {
  const { user } = useAuth()
  return useQuery({
    queryKey: nutritionOverviewKey(user?.id, athleteId, range),
    queryFn: () => getNutritionOverview(athleteId, range),
    enabled: user !== null && athleteId !== '',
  })
}
