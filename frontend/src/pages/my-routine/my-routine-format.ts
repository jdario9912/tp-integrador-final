import type { AthleteRoutine } from '../../lib/athlete-routine'
import { formatIsoDate } from '../../lib/iso-date'
import type { RoutineDay } from '../../lib/routines'
import {
  formatStartTime,
  type TrainingSession,
} from '../../lib/training-sessions'

// "Día 1: Torso"
export const dayTitle = ({
  dayNumber,
  name,
}: Pick<RoutineDay, 'dayNumber' | 'name'>) => `Día ${dayNumber}: ${name}`

// expired lo calcula el backend con el "hoy" de la zona de la app: acá solo se formatea.
// Sin endDate la rutina no vence (y expired siempre es false, contrato 9.5)
export const formatValidity = ({
  endDate,
  expired,
}: Pick<AthleteRoutine, 'endDate' | 'expired'>) => {
  if (endDate === null) return 'Sin fecha de vencimiento'
  return expired
    ? `Venció el ${formatIsoDate(endDate)}`
    : `Vigente hasta el ${formatIsoDate(endDate)}`
}

// desde cuándo está en curso el entrenamiento: "desde las 19:15", o con la fecha si quedó abierto
// de otro día. sessionDate y today son fechas de la zona de la app
export const formatInProgressSince = (
  {
    sessionDate,
    startedAt,
  }: Pick<TrainingSession, 'sessionDate' | 'startedAt'>,
  today: string,
) => {
  const time = formatStartTime(startedAt)
  return sessionDate === today
    ? `desde las ${time}`
    : `desde el ${formatIsoDate(sessionDate)} a las ${time}`
}
