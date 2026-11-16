// rango de fechas del historial (YYYY-MM-DD, inclusivo). Vacío = sin límite
export type DateRange = { from: string; to: string }

export const EMPTY_RANGE: DateRange = { from: '', to: '' }
