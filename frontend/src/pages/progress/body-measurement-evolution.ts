import {
  formatBodyMeasurementValue,
  type BodyMeasurementRecord,
} from '../../lib/body-measurements'
import { fieldKey, type MeasurementField } from './body-measurement-fields'
import {
  toValuePoints,
  type ChartMetric,
  type ChartPoint,
} from './weight-chart-scale'

// US-45 (F3): el selector de la evolución. "weight" es el peso (la clave por defecto, sin
// parámetro en la URL); cualquier otro valor es la clave de un campo de medida (WAIST, ARM-LEFT)
export const WEIGHT_METRIC_KEY = 'weight'

export type EvolutionMetricOption = { value: string; label: string }

export const evolutionMetricOptions = (
  fields: MeasurementField[],
): EvolutionMetricOption[] => [
  { value: WEIGHT_METRIC_KEY, label: 'Peso' },
  ...fields.map((field) => ({ value: field.key, label: field.label })),
]

// la métrica de la URL, si existe en el catálogo cargado; si no, el peso
export const resolveEvolutionMetric = (
  key: string,
  fields: MeasurementField[],
): MeasurementField | undefined => fields.find((field) => field.key === key)

// valores de una medida a lo largo de los registros; un registro sin esa medida no aporta punto
export const measurementPoints = (
  records: BodyMeasurementRecord[],
  key: string,
): ChartPoint[] =>
  toValuePoints(
    records.flatMap((record) =>
      record.values
        .filter(
          (value) => fieldKey(value.type, value.side ?? undefined) === key,
        )
        .map((value) => ({ date: record.date, value: value.value })),
    ),
  )

// el gráfico dibuja la medida con su unidad, igual que el peso dibuja kilos
export const measurementChartMetric = (
  field: MeasurementField,
): ChartMetric => ({
  title: `Evolución: ${field.label}`,
  columnLabel: field.label,
  formatValue: (value) => formatBodyMeasurementValue(value, field.unit),
})
