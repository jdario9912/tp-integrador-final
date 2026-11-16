import { APP_TIME_ZONE, formatIsoDate } from '../iso-date'
import type { SessionStatus, TrainingHistoryItem } from './types'

// rótulos en español de los estados cerrados (US-21). En curso no entra al historial
export const historyStatusLabels: Record<
  Exclude<SessionStatus, 'IN_PROGRESS'>,
  string
> = {
  FINISHED: 'Finalizada',
  CANCELLED: 'Cancelada',
}

// "3 de 7 series": hechas sobre prescritas (contrato 14.2)
export const formatCompletion = ({
  doneSets,
  prescribedSets,
}: Pick<TrainingHistoryItem['summary'], 'doneSets' | 'prescribedSets'>) =>
  `${doneSets} de ${prescribedSets} ${prescribedSets === 1 ? 'serie' : 'series'}`

const reviewedDateFormat = new Intl.DateTimeFormat('en-CA', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  timeZone: APP_TIME_ZONE,
})

// fecha de la revisión en YYYY-MM-DD de la zona de la app, para mostrarla con formatIsoDate
export const formatReviewedDate = (reviewedAt: string) =>
  formatIsoDate(reviewedDateFormat.format(new Date(reviewedAt)))

// el día del entrenamiento con su número: "Día 2 · Piernas"
export const formatDayLabel = ({
  dayNumber,
  dayName,
}: Pick<TrainingHistoryItem, 'dayNumber' | 'dayName'>) =>
  `Día ${dayNumber} · ${dayName}`
