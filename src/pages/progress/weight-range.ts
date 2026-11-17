// rango del gráfico de peso (US-29). Viaja en la URL como ?from=AAAA-MM-DD&to=AAAA-MM-DD,
// ambos inclusivos y opcionales (contrato de API, 8.6). Sin ninguno, es "Todo".

export type WeightRange = { from?: string; to?: string }

export type RangePreset = '30d' | '3m' | '6m' | '1y' | 'all'

export const RANGE_PRESETS = [
  { value: '30d', label: '30 días' },
  { value: '3m', label: '3 meses' },
  { value: '6m', label: '6 meses' },
  { value: '1y', label: '1 año' },
  { value: 'all', label: 'Todo' },
] as const satisfies readonly { value: RangePreset; label: string }[]

type Shift = { days: number } | { months: number }

const PRESET_SHIFTS: Record<Exclude<RangePreset, 'all'>, Shift> = {
  '30d': { days: -30 },
  '3m': { months: -3 },
  '6m': { months: -6 },
  '1y': { months: -12 },
}

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

// fecha YYYY-MM-DD que existe de verdad (2026-02-30 no)
export const isValidIsoDate = (value: string) => {
  if (!ISO_DATE_PATTERN.test(value)) return false
  const [year, month, day] = value.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  )
}

const toIsoDate = (date: Date) => date.toISOString().slice(0, 10)

const shiftIsoDate = (isoDate: string, shift: Shift) => {
  const [year, month, day] = isoDate.split('-').map(Number)
  if ('days' in shift) {
    return toIsoDate(new Date(Date.UTC(year, month - 1, day + shift.days)))
  }
  // mismo día en el mes destino, o el último si no existe (31 de mayo − 3 meses = 28 de febrero)
  const targetMonth = month - 1 + shift.months
  const lastDay = new Date(Date.UTC(year, targetMonth + 1, 0)).getUTCDate()
  return toIsoDate(
    new Date(Date.UTC(year, targetMonth, Math.min(day, lastDay))),
  )
}

// el atajo va hasta hoy (en la zona de la app) y arranca N días o meses antes
export const rangeOfPreset = (
  preset: RangePreset,
  today: string,
): WeightRange =>
  preset === 'all'
    ? {}
    : { from: shiftIsoDate(today, PRESET_SHIFTS[preset]), to: today }

const sameRange = (a: WeightRange, b: WeightRange) =>
  a.from === b.from && a.to === b.to

// qué atajo corresponde al rango de la URL; si no coincide con ninguno, "personalizado"
export const presetOf = (
  range: WeightRange,
  today: string,
): RangePreset | 'custom' => {
  if (!range.from && !range.to) return 'all'
  const match = RANGE_PRESETS.find(
    ({ value }) =>
      value !== 'all' && sameRange(rangeOfPreset(value, today), range),
  )
  return match?.value ?? 'custom'
}

export type RangeFieldError = { field: 'from' | 'to'; message: string }

// validación del rango antes de pedir datos. Los mensajes del "desde posterior" son los del backend
export const validateRange = (
  range: WeightRange,
): RangeFieldError | undefined => {
  if (range.from && !isValidIsoDate(range.from))
    return { field: 'from', message: 'La fecha desde no es válida' }
  if (range.to && !isValidIsoDate(range.to))
    return { field: 'to', message: 'La fecha hasta no es válida' }
  if (range.from && range.to && range.from > range.to)
    return {
      field: 'from',
      message: 'La fecha desde no puede ser posterior a la fecha hasta',
    }
  return undefined
}

// lee el rango de la URL tal como viene: validateRange decide si sirve
export const rangeFromSearchParams = (
  params: URLSearchParams,
): WeightRange => ({
  from: params.get('from') || undefined,
  to: params.get('to') || undefined,
})
