import { normalizeDecimal } from '../../lib/decimal'
import type {
  BodyMeasurementRecord,
  BodyMeasurementRecordInput,
} from '../../lib/body-measurements'
import { fieldKey, type MeasurementField } from './body-measurement-fields'
import type { BodyMeasurementFormValues } from './types'

// alta: la fecha arranca en "hoy" (zona de la app) y todas las medidas vacías
export const emptyBodyMeasurementFormValues = (
  today: string,
  fields: MeasurementField[],
): BodyMeasurementFormValues => ({
  date: today,
  comment: '',
  measurements: Object.fromEntries(fields.map((field) => [field.key, ''])),
})

// precarga la edición: cada campo muestra el valor que tenía el registro (o vacío)
export const toBodyMeasurementFormValues = (
  record: BodyMeasurementRecord,
  fields: MeasurementField[],
): BodyMeasurementFormValues => ({
  date: record.date,
  comment: record.comment ?? '',
  measurements: Object.fromEntries(
    fields.map((field) => {
      const found = record.values.find(
        (value) => fieldKey(value.type, value.side ?? undefined) === field.key,
      )
      return [field.key, found ? String(found.value) : '']
    }),
  ),
})

// se llama después de validar. Solo viajan las medidas con valor (sin "value: null");
// en las no bilaterales no va la clave "side". Devuelve también la clave de campo de cada
// elemento de values, para llevar un error del servidor ("values[1].value") a su campo
export const toBodyMeasurementInput = (
  values: BodyMeasurementFormValues,
  fields: MeasurementField[],
): { input: BodyMeasurementRecordInput; fieldKeys: string[] } => {
  const filled = fields.filter(
    (field) => normalizeDecimal(values.measurements[field.key] ?? '') !== '',
  )
  return {
    input: {
      date: values.date,
      // un comentario vacío va en null: en la edición borra el que había
      comment: values.comment.trim() || null,
      values: filled.map((field) => ({
        type: field.type,
        ...(field.side ? { side: field.side } : {}),
        value: Number(normalizeDecimal(values.measurements[field.key])),
      })),
    },
    fieldKeys: filled.map((field) => field.key),
  }
}

// "values[1].side" → la clave del campo de esa posición del envío
export const fieldKeyOfServerError = (field: string, fieldKeys: string[]) => {
  const match = /^values\[(\d+)\]/.exec(field)
  return match ? fieldKeys[Number(match[1])] : undefined
}
