// US-45: medidas corporales (plan §Diseño, D-028). Un registro por atleta y por día, con varias medidas

// lado de una medida bilateral (brazo, pierna). Las demás medidas van sin lado (null)
export type BodyMeasurementSide = 'LEFT' | 'RIGHT'

// entrada del catálogo (GET /api/body-measurement-types): define nombre, unidad y rango válido
export type BodyMeasurementType = {
  // código estable: WAIST, CHEST, HIP, ARM, LEG, BODY_FAT
  code: string
  name: string
  // "cm" o "%"
  unit: string
  // si lleva lado izquierdo y derecho
  bilateral: boolean
  min: number
  max: number
}

export type BodyMeasurementValue = {
  type: string
  side: BodyMeasurementSide | null
  value: number
}

// registro de medidas tal como lo devuelve la API
export type BodyMeasurementRecord = {
  id: string
  // día del registro, YYYY-MM-DD
  date: string
  // ya recortado; null si no hay
  comment: string | null
  values: BodyMeasurementValue[]
  createdAt: string
  // igual a createdAt mientras no se edite
  updatedAt: string
}

// medida tal como se envía: en las no bilaterales la clave "side" no va (ni null ni ausente, contrato 17.4)
export type BodyMeasurementValueInput = {
  type: string
  side?: BodyMeasurementSide
  value: number
}

// body del alta y de la edición. La edición reemplaza la lista de valores completa
export type BodyMeasurementRecordInput = {
  date: string
  comment: string | null
  values: BodyMeasurementValueInput[]
}

// query params del listado (rango inclusivo y paginación, como los pesos)
export type BodyMeasurementsQuery = {
  from?: string
  to?: string
  page?: number
  size?: number
}
