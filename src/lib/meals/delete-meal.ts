import { del } from '../api'

// borrado físico de la comida y sus ítems (11.6): 204 sin cuerpo
export const deleteMeal = (athleteId: string, mealId: string) =>
  del(`/athletes/${athleteId}/meals/${mealId}`)
