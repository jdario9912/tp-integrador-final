import { putForm } from '../api'
import type { OwnProfile } from './types'

// multipart con la parte file (contrato de US-48). Reemplaza la foto anterior
export const uploadOwnPhoto = (file: File) => {
  const form = new FormData()
  form.append('file', file)
  return putForm<OwnProfile>('/users/me/photo', form)
}
