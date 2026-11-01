import { get } from '../api'
import type { Athlete } from './types'

export const getAthlete = (id: string) => get<Athlete>(`/athletes/${id}`)
