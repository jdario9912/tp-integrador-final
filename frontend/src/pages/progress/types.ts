// en el formulario todos los campos son strings, como los devuelven los inputs
export type WeightFormValues = {
  // YYYY-MM-DD, el formato de <input type="date">
  date: string
  weightKg: string
  comment: string
}

export type WeightFieldName = keyof WeightFormValues
