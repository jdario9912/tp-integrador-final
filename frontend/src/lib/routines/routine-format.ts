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

export const formatExercisesCount = (count: number) =>
  count === 1 ? '1 ejercicio' : `${count} ejercicios`

// "4 × 10": series por repeticiones
export const formatSetsReps = (sets: number, reps: number) =>
  `${sets} × ${reps}`

const weightFormat = new Intl.NumberFormat('es-AR', {
  maximumFractionDigits: 2,
})

export const formatWeight = (kg: number) => `${weightFormat.format(kg)} kg`

// el descanso se carga en segundos; se muestra en minutos cuando es más legible
export const formatRest = (seconds: number) => {
  if (seconds < 60) return `${seconds} s`
  const minutes = Math.floor(seconds / 60)
  const rest = seconds % 60
  return rest === 0 ? `${minutes} min` : `${minutes} min ${rest} s`
}
