import { get } from '../../../lib/api'
import type { Athlete } from '../../../lib/athletes'

export const getAthlete = (id: string) => get<Athlete>(`/athletes/${id}`)
