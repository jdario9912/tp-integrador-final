import { postForm } from '../api'
import type { ProgressPhoto, ProgressPhotoUploadInput } from './types'

// multipart con las partes file, type y takenOn (contrato, 3.1). Un reintento crea otra foto
export const uploadProgressPhoto = (
  athleteId: string,
  input: ProgressPhotoUploadInput,
) => {
  const form = new FormData()
  form.append('file', input.file)
  form.append('type', input.type)
  if (input.takenOn) form.append('takenOn', input.takenOn)
  return postForm<ProgressPhoto>(`/athletes/${athleteId}/photos`, form)
}
