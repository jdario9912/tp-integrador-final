// registro de peso corporal (contrato de API, 8.2): uno por día y por atleta
export type WeightRecord = {
  id: string
  // día del registro, YYYY-MM-DD
  date: string
  // de 20 a 300, hasta 2 decimales
  weightKg: number
  // ya recortado; null si no hay
  comment: string | null
  createdAt: string
  // igual a createdAt mientras no se edite
  updatedAt: string
}

// body del alta y de la edición (8.3). La edición es completa: un comment en null lo borra
export type WeightRecordInput = {
  date: string
  weightKg: number
  comment: string | null
}

// query params de GET /athletes/{athleteId}/weights (8.6): todos opcionales.
// from y to son inclusivos; el orden es siempre por fecha descendente
export type WeightsQuery = {
  from?: string
  to?: string
  // desde 0
  page?: number
  size?: number
}
