import { formatIsoDate } from '../../lib/iso-date'
import {
  appDateOf,
  formatStartTime,
  type SessionStatus,
  type TrainingSession,
} from '../../lib/training-sessions'

// en US-18 todas están en curso; desde US-20 la misma pantalla muestra, de solo lectura, las
// finalizadas y las canceladas (contrato de API, 10.5)
const titles: Record<SessionStatus, string> = {
  IN_PROGRESS: 'Entrenamiento en curso',
  FINISHED: 'Entrenamiento finalizado',
  CANCELLED: 'Entrenamiento cancelado',
}

export const sessionTitle = (status: SessionStatus) => titles[status]

// "Empezaste hoy a las 19:15", o con la fecha si quedó abierto de otro día. sessionDate y today
// son fechas de la zona de la app
export const formatStartedAt = (
  {
    sessionDate,
    startedAt,
  }: Pick<TrainingSession, 'sessionDate' | 'startedAt'>,
  today: string,
) => {
  const time = formatStartTime(startedAt)
  return sessionDate === today
    ? `Empezaste hoy a las ${time}`
    : `Empezaste el ${formatIsoDate(sessionDate)} a las ${time}`
}

// "Terminaste a las 20:05" o "Cancelaste a las 20:05". Con la fecha si terminó otro día que el de
// inicio. Sin hora de fin (en curso), no hay nada que decir
export const formatEndedAt = ({
  status,
  sessionDate,
  endedAt,
}: Pick<TrainingSession, 'status' | 'sessionDate' | 'endedAt'>) => {
  if (!endedAt) return null
  const verb = status === 'CANCELLED' ? 'Cancelaste' : 'Terminaste'
  const time = formatStartTime(endedAt)
  const day = appDateOf(endedAt)
  return day === sessionDate
    ? `${verb} a las ${time}`
    : `${verb} el ${formatIsoDate(day)} a las ${time}`
}
