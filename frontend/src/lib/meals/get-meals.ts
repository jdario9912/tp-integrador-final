import { get } from '../api'
import type { Meal } from './types'

// comidas de un día (contrato 11.7): sin paginación, el front siempre manda la fecha
export const getMealsOfDay = (athleteId: string, date: string) =>
  get<Meal[]>(`/athletes/${athleteId}/meals`, { params: { date } })
