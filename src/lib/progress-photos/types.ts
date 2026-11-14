// código de photo_types (contrato de US-28, 2.1)
export type ProgressPhotoType = 'FRONT' | 'SIDE' | 'BACK'

// ProgressPhotoResponse (contrato de US-28, 2): nunca trae la ruta interna del objeto
export type ProgressPhoto = {
  id: string
  type: ProgressPhotoType
  // YYYY-MM-DD, el día en que se tomó la foto
  takenOn: string
  // URL firmada de lectura: vence en urlExpiresAt
  url: string
  // instante ISO-8601 en UTC
  urlExpiresAt: string
  createdAt: string
}

export type ProgressPhotoUploadInput = {
  file: File
  type: ProgressPhotoType
  // YYYY-MM-DD; si se omite, el backend usa hoy en la zona de la app
  takenOn?: string
}

export type ProgressPhotosQuery = {
  page?: number
  size?: number
}
