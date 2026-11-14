// reglas de una serie, las mismas del backend (contrato 11.3) para no ir a la red con un valor que
// se va a rechazar. Los textos son los que ve el atleta, en la fila de la serie
import { normalizeDecimal } from '../../lib/decimal'

export const WEIGHT_MAX = 9999.99
export const REPS_MAX = 999
export const RPE_MIN = 1
export const RPE_MAX = 10
export const SKIP_REASON_MAX_LENGTH = 200

const WEIGHT_RANGE_MESSAGE = 'El peso debe estar entre 0 y 9999,99'
const REPS_RANGE_MESSAGE = `Las repeticiones deben estar entre 1 y ${REPS_MAX}`
const RPE_RANGE_MESSAGE = `El RPE debe estar entre ${RPE_MIN} y ${RPE_MAX}`

// hasta 2 decimales, sin signo: el signo se valida aparte para dar su propio mensaje
const WEIGHT_PATTERN = /^\d+(\.\d{1,2})?$/
const WHOLE_NUMBER_PATTERN = /^\d+$/

// el peso se escribe con coma o con punto (lo normaliza normalizeDecimal)
export const validateWeight = (raw: string) => {
  const value = normalizeDecimal(raw)
  if (value === '') return 'Ingresá el peso de una serie realizada'
  if (value.startsWith('-')) return 'El peso no puede ser negativo'
  if (!WEIGHT_PATTERN.test(value) || Number(value) > WEIGHT_MAX) {
    return WEIGHT_RANGE_MESSAGE
  }
  return undefined
}

export const validateReps = (raw: string) => {
  const value = raw.trim()
  if (value === '') return 'Ingresá las repeticiones de una serie realizada'
  if (!WHOLE_NUMBER_PATTERN.test(value)) return REPS_RANGE_MESSAGE
  const reps = Number(value)
  return reps >= 1 && reps <= REPS_MAX ? undefined : REPS_RANGE_MESSAGE
}

// el RPE es opcional: vacío es válido
export const validateRpe = (raw: string) => {
  const value = raw.trim()
  if (value === '') return undefined
  if (!WHOLE_NUMBER_PATTERN.test(value)) return RPE_RANGE_MESSAGE
  const rpe = Number(value)
  return rpe >= RPE_MIN && rpe <= RPE_MAX ? undefined : RPE_RANGE_MESSAGE
}

export const validateSkipReason = (raw: string) => {
  const value = raw.trim()
  if (value === '') return 'Ingresá el motivo de una serie omitida'
  if (value.length > SKIP_REASON_MAX_LENGTH) {
    return `El motivo no puede superar los ${SKIP_REASON_MAX_LENGTH} caracteres`
  }
  return undefined
}
