import { get, type PageResponse } from '../api'
import type { ProgressPhoto, ProgressPhotosQuery } from './types'

// orden cronológico (la más antigua primero) lo fija el backend (contrato, 4)
export const getProgressPhotos = (
  athleteId: string,
  query: ProgressPhotosQuery = {},
) =>
  get<PageResponse<ProgressPhoto>>(`/athletes/${athleteId}/photos`, {
    params: query,
  })

// detalle con una URL firmada nueva (contrato, 5): sirve para renovar una URL vencida
export const getProgressPhoto = (athleteId: string, photoId: string) =>
  get<ProgressPhoto>(`/athletes/${athleteId}/photos/${photoId}`)
