import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../../../lib/auth'
import { getDailyNutritionSummary } from '../actions/get-daily-summary'
import { dailySummaryKey } from '../summary-key'

// resumen nutricional de un día del atleta; la fecha la define la página (la URL o hoy)
export const useDailyNutritionSummary = (athleteId: string, date: string) => {
  const { user } = useAuth()
  return useQuery({
    queryKey: dailySummaryKey(user?.id, athleteId, date),
    queryFn: () => getDailyNutritionSummary(athleteId, date),
    enabled: user !== null && athleteId !== '',
  })
}
