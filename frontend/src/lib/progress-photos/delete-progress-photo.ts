import { del } from '../api'

// 204 sin body; la segunda vez responde 404 (contrato, 6)
export const deleteProgressPhoto = (athleteId: string, photoId: string) =>
  del(`/athletes/${athleteId}/photos/${photoId}`)
