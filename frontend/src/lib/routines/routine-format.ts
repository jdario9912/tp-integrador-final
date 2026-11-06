export const formatDaysPerWeek = (days: number) =>
  days === 1 ? '1 día por semana' : `${days} días por semana`

export const formatDurationWeeks = (weeks: number) =>
  weeks === 1 ? '1 semana' : `${weeks} semanas`

// createdAt es un instante: se muestra el día en la zona horaria de quien lo ve
const dateFormat = new Intl.DateTimeFormat('es-AR', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
})

export const formatCreatedAt = (instant: string) =>
  dateFormat.format(new Date(instant))
