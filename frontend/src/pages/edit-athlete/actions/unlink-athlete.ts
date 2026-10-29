import { patch } from '../../../lib/api'

// 204 sin body
export const unlinkAthlete = (id: string) =>
  patch<void>(`/athletes/${id}/unlink`, undefined)
