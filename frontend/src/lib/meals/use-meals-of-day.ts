import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../auth'
import { getMealsOfDay } from './get-meals'
import { mealsOfDayKey } from './meal-keys'

// comidas del atleta en un día; la fecha va explícita (la define la página, en la zona de la app)
export const useMealsOfDay = (athleteId: string, date: string) => {
  const { user } = useAuth()
  return useQuery({
    queryKey: mealsOfDayKey(user?.id, athleteId, date),
    queryFn: () => getMealsOfDay(athleteId, date),
    enabled: user !== null && athleteId !== '',
  })
}
