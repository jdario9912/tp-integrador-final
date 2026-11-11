import { normalizeDecimal } from '../../lib/decimal'
import type { WeightRecord, WeightRecordInput } from '../../lib/weights'
import type { WeightFormValues } from './types'

// alta: la fecha arranca en "hoy" (zona de la app)
export const emptyWeightFormValues = (today: string): WeightFormValues => ({
  date: today,
  weightKg: '',
  comment: '',
})

// precarga la edición
export const toWeightFormValues = (record: WeightRecord): WeightFormValues => ({
  date: record.date,
  weightKg: String(record.weightKg),
  comment: record.comment ?? '',
})

// se llama después de validar: el peso siempre es un número válido.
// Un comentario vacío va en null: en la edición borra el que había
export const toWeightRecordInput = (
  values: WeightFormValues,
): WeightRecordInput => ({
  date: values.date,
  weightKg: Number(normalizeDecimal(values.weightKg)),
  comment: values.comment.trim() || null,
})
