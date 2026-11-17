import { formatIsoDate, parseIsoDate } from '../../lib/iso-date'
import { shiftDay } from '../meals/day-navigation'
import type { NutritionRange } from './types'

// alimentación del atleta (US-25): la semana son los 7 días que terminan en `end` (como el rango por
// defecto del backend: los últimos 7 días hasta hoy)
export const WEEK_DAYS = 7

export const weekEndingOn = (end: string): NutritionRange => ({
  from: shiftDay(end, -(WEEK_DAYS - 1)),
  to: end,
})

// semana anterior (-1) o siguiente (+1); la siguiente nunca pasa de hoy
export const shiftWeekEnd = (end: string, weeks: number, today: string) => {
  const next = shiftDay(end, weeks * WEEK_DAYS)
  return next > today ? today : next
}

// el día siguiente no pasa de hoy: no hay comidas futuras
export const shiftDayUntil = (day: string, days: number, today: string) => {
  const next = shiftDay(day, days)
  return next > today ? today : next
}

const dayMonthFormat = new Intl.DateTimeFormat('es-AR', {
  day: 'numeric',
  month: 'long',
  timeZone: 'UTC',
})

const weekdayFormat = new Intl.DateTimeFormat('es-AR', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  timeZone: 'UTC',
})

const toUtcDate = (isoDate: string) => {
  const { year, month, day } = parseIsoDate(isoDate)
  return new Date(Date.UTC(year, month - 1, day))
}

// "11 de noviembre al 17 de noviembre de 2026"; con el año en las dos si la semana cruza de año
export const formatRange = ({ from, to }: NutritionRange) =>
  from.slice(0, 4) === to.slice(0, 4)
    ? `${dayMonthFormat.format(toUtcDate(from))} al ${formatIsoDate(to)}`
    : `${formatIsoDate(from)} al ${formatIsoDate(to)}`

// "martes, 17 de noviembre": el día de una fila de la semana
export const formatWeekday = (isoDate: string) =>
  weekdayFormat.format(toUtcDate(isoDate))

// constancia de registro: días con al menos una comida sobre los días del rango
export const consistencyText = (daysWithMeals: number, totalDays: number) =>
  `${daysWithMeals} de ${totalDays} ${totalDays === 1 ? 'día' : 'días'} con comidas`

export const mealCountText = (count: number) => {
  if (count === 0) return 'Sin comidas'
  return count === 1 ? '1 comida' : `${count} comidas`
}
