import { APP_TIME_ZONE } from '../../lib/iso-date'
import type { MealType } from '../../lib/meals'

// tipo que se preselecciona según la hora (en la zona de la app). Un toque lo cambia
export const suggestedMealType = (hour: number): MealType => {
  if (hour < 11) return 'BREAKFAST'
  if (hour < 15) return 'LUNCH'
  if (hour < 19) return 'SNACK'
  return 'DINNER'
}

const hourFormat = new Intl.DateTimeFormat('en-US', {
  timeZone: APP_TIME_ZONE,
  hour: 'numeric',
  // h23: medianoche es 0, no 24
  hourCycle: 'h23',
})

// hora actual (0 a 23) en la zona de la app, no en la del navegador
export const hourInAppTimeZone = (now = new Date()) => {
  const hour = hourFormat.formatToParts(now).find((p) => p.type === 'hour')
  return Number(hour?.value ?? 0) % 24
}
