import { APP_TIME_ZONE } from '../iso-date'

// la hora en la zona de la app (contrato de API, 10.12), no en la del navegador. es-AR usa el
// reloj de 12 horas por defecto: se pide el de 24
const timeFormat = new Intl.DateTimeFormat('es-AR', {
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
  timeZone: APP_TIME_ZONE,
})

// "19:15": startedAt es un instante en UTC
export const formatStartTime = (startedAt: string) =>
  timeFormat.format(new Date(startedAt))

// fecha YYYY-MM-DD de un instante en la zona de la app (US-20): si la sesión terminó otro día
// que el de inicio, la hora de fin va con la fecha
const appDateFormat = new Intl.DateTimeFormat('en-CA', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  timeZone: APP_TIME_ZONE,
})

export const appDateOf = (instant: string) =>
  appDateFormat.format(new Date(instant))

// duración entre inicio y fin: "45 min", "1 h 5 min" o "2 h". Menos de un minuto no se muestra
// como cero: "menos de 1 min"
export const formatDuration = (startedAt: string, endedAt: string) => {
  const minutes = Math.round(
    (Date.parse(endedAt) - Date.parse(startedAt)) / 60_000,
  )
  if (minutes < 1) return 'menos de 1 min'
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  return rest === 0 ? `${hours} h` : `${hours} h ${rest} min`
}
