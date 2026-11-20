import { formatIsoDate, parseIsoDate } from '../../lib/iso-date'
import { formatWeightKg } from '../../lib/weights'

// punto del gráfico: un valor (kg del peso, cm o % de una medida) con su día en milisegundos
// (UTC, para la escala X). US-45 generaliza el campo: el gráfico no sabe qué mide
export type ChartPoint = { date: string; value: number; time: number }

// lo que el gráfico necesita saber de la métrica que dibuja: títulos y formato del valor
// (US-45: el peso y cada medida corporal usan el mismo gráfico)
export type ChartMetric = {
  // título accesible del gráfico y de la tarjeta
  title: string
  // nombre de la columna de la tabla de datos
  columnLabel: string
  formatValue: (value: number) => string
}

export const WEIGHT_CHART_METRIC: ChartMetric = {
  title: 'Evolución del peso',
  columnLabel: 'Peso',
  formatValue: formatWeightKg,
}

// de cualquier lista de { fecha, valor } a puntos ordenados de la más antigua a la más nueva
export const toValuePoints = (
  entries: { date: string; value: number }[],
): ChartPoint[] =>
  entries
    .map(({ date, value }) => {
      const { year, month, day } = parseIsoDate(date)
      return { date, value, time: Date.UTC(year, month - 1, day) }
    })
    .sort((a, b) => a.time - b.time)

export const toChartPoints = (
  records: { date: string; weightKg: number }[],
): ChartPoint[] =>
  toValuePoints(
    records.map(({ date, weightKg }) => ({ date, value: weightKg })),
  )

// escalones "bonitos" para los kilos: 72,0 / 72,5 / 73,0 y no 72,37 / 73,12
const NICE_STEPS = [0.5, 1, 2, 2.5, 5, 10, 20, 25, 50, 100]
// un gráfico de menos de 2 kg de alto exagera cualquier variación
const MIN_SPAN_KG = 2

export type YAxis = { min: number; max: number; ticks: number[] }

// escala Y con ticks redondos que contienen todos los valores, con un poco de aire arriba y abajo.
// Funciona con un solo valor (no hay división por cero) y con varios
export const niceYAxis = (values: number[], targetIntervals = 4): YAxis => {
  const low = values.reduce((min, v) => Math.min(min, v), Infinity)
  const high = values.reduce((max, v) => Math.max(max, v), -Infinity)
  // el rango se centra en los datos: un valor solo queda en el medio de un tramo de MIN_SPAN_KG
  const span = Math.max(high - low, MIN_SPAN_KG)
  const center = (low + high) / 2
  const rawStep = span / targetIntervals
  const step =
    NICE_STEPS.find((candidate) => candidate >= rawStep) ??
    Math.ceil(rawStep / 100) * 100
  // un peso no baja de 0: el eje tampoco
  const min = Math.max(
    0,
    Math.floor((center - span / 2 - step / 2) / step) * step,
  )
  const max = Math.ceil((center + span / 2 + step / 2) / step) * step
  const intervals = Math.round((max - min) / step)
  const ticks = Array.from(
    { length: intervals + 1 },
    (_, index) => Math.round((min + index * step) * 100) / 100,
  )
  return { min, max, ticks }
}

// Y crece hacia arriba: el kilo más alto queda arriba del área de dibujo
export const yFor = (value: number, axis: YAxis, top: number, height: number) =>
  top + (1 - (value - axis.min) / (axis.max - axis.min)) * height

// X es proporcional al día. Un solo día (o ninguna distancia) cae al centro, no divide por cero
export const xFor = (
  time: number,
  first: number,
  last: number,
  left: number,
  width: number,
) =>
  last === first
    ? left + width / 2
    : left + ((time - first) / (last - first)) * width

// índices de los puntos que llevan etiqueta de fecha: siempre el primero y el último
export const pickLabelIndexes = (count: number, maxLabels: number) => {
  if (count <= maxLabels) return Array.from({ length: count }, (_, i) => i)
  const slots = Math.max(2, maxLabels)
  const indexes = new Set<number>()
  for (let slot = 0; slot < slots; slot++) {
    indexes.add(Math.round((slot * (count - 1)) / (slots - 1)))
  }
  return [...indexes]
}

const kgFormat = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 1 })
export const formatKgTick = (kg: number) => kgFormat.format(kg)

const shortDateFormat = new Intl.DateTimeFormat('es-AR', {
  day: 'numeric',
  month: 'short',
  timeZone: 'UTC',
})

// fecha corta para el eje X: "6 nov."
export const formatChartDate = (isoDate: string) => {
  const { year, month, day } = parseIsoDate(isoDate)
  return shortDateFormat.format(new Date(Date.UTC(year, month - 1, day)))
}

// texto alternativo del gráfico para lectores de pantalla (el dibujo solo no se describe).
// formatValue es el de la métrica (peso por defecto, cm o % en las medidas, US-45)
export const describeWeightChart = (
  points: ChartPoint[],
  formatValue: (value: number) => string = formatWeightKg,
) => {
  if (points.length === 0) return 'Sin registros en este rango'
  const first = points[0]
  const last = points[points.length - 1]
  const count =
    points.length === 1 ? '1 registro' : `${points.length} registros`
  return `${count}, del ${formatIsoDate(first.date)} al ${formatIsoDate(last.date)}. De ${formatValue(first.value)} a ${formatValue(last.value)}.`
}
