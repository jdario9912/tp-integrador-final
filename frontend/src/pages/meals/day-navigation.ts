// navegación por días de la página de comidas: el día va en la URL (?date=AAAA-MM-DD)

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/

// formato YYYY-MM-DD y una fecha que existe de verdad (no 2026-02-31)
export const isValidIsoDate = (value: string | null): value is string => {
  const match = value === null ? null : ISO_DATE.exec(value)
  if (!match) return false
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const date = new Date(Date.UTC(year, month - 1, day))
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  )
}

// el día que se muestra: el de la URL si es válido y no es futuro; si no, hoy
export const resolveDay = (param: string | null, today: string) =>
  isValidIsoDate(param) && param <= today ? param : today

// día anterior (-1) o siguiente (+1) en el calendario, sin depender de la zona horaria del navegador
export const shiftDay = (date: string, days: number) => {
  const [year, month, day] = date.split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, day + days))
    .toISOString()
    .slice(0, 10)
}

// hoy no lleva ?date=: la página sin fecha ya muestra hoy
export const dayParams = (
  day: string,
  today: string,
): Record<string, string> => (day === today ? {} : { date: day })

export const dayTitle = (day: string, today: string) =>
  day === today ? 'Comidas de hoy' : 'Comidas del día'
