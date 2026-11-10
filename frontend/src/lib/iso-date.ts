// fechas sin hora en formato YYYY-MM-DD (nacimiento, inicio, registros de peso)

export const parseIsoDate = (isoDate: string) => {
  const [year, month, day] = isoDate.split('-').map(Number)
  return { year, month, day }
}

// se arman y se formatean en UTC para que la zona horaria no corra el día
// (new Date('2000-05-20') en Argentina sería el 19 a la noche)
const dateFormat = new Intl.DateTimeFormat('es-AR', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
})

export const formatIsoDate = (isoDate: string) => {
  const { year, month, day } = parseIsoDate(isoDate)
  return dateFormat.format(new Date(Date.UTC(year, month - 1, day)))
}

// zona horaria de la app (contrato de API, 8.8): define qué día es "hoy" para las reglas de
// negocio, igual que APP_TIME_ZONE en el backend. No se usa la del navegador: en un dispositivo
// con otra zona su "hoy" puede ser "mañana" para el backend
export const APP_TIME_ZONE = 'America/Argentina/Buenos_Aires'

const appDateParts = new Intl.DateTimeFormat('en-US', {
  timeZone: APP_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

// fecha de hoy en la zona de la app, en YYYY-MM-DD (el formato de <input type="date">)
export const todayInAppTimeZone = (now = new Date()) => {
  const parts = appDateParts.formatToParts(now)
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value
  return `${part('year')}-${part('month')}-${part('day')}`
}
