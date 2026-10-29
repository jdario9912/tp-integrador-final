import { post } from '../../../lib/api'
import type { Athlete } from '../../../lib/athletes'

// sin body: la acción va en la URL
export const setAthleteActive = (id: string, active: boolean) =>
  post<Athlete>(
    `/athletes/${id}/${active ? 'reactivate' : 'deactivate'}`,
    undefined,
  )
