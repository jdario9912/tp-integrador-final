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
