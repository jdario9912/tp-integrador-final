import { formatIsoDate } from '../../lib/iso-date'
import type { AthleteRoutine } from '../../lib/athlete-routine'
import type { RoutineDay } from '../../lib/routines'
import type { TrainingHistoryItem } from '../../lib/training-sessions'

// observaciones que muestra la tarjeta del entrenador (plan US-12: como máximo 3)
export const OBSERVATIONS_SHOWN = 3

// sesiones cerradas que se piden para buscar observaciones. La API no filtra por revisión: una
// observación más vieja que estas sesiones no aparece en el panel (ver el README, US-12)
export const HISTORY_PAGE_SIZE = 20

// ejercicios que se listan del día antes de "y N más"
export const EXERCISES_SHOWN = 4

// el día que le toca al atleta (nextDayId, contrato 9.6). null si no está en los días de la rutina
export const nextDayOf = ({
  nextDayId,
  routine,
}: Pick<AthleteRoutine, 'nextDayId' | 'routine'>): RoutineDay | null =>
  routine.days.find((day) => day.id === nextDayId) ?? null

// "Día 1: Torso", como en Mi rutina
export const dayTitle = ({
  dayNumber,
  name,
}: Pick<RoutineDay, 'dayNumber' | 'name'>) => `Día ${dayNumber}: ${name}`

// observaciones con texto, en el orden que da la API (la más reciente primero). Una sesión revisada
// sin texto no cuenta: el panel muestra solo lo que dejó el entrenador
export const latestObservations = (
  items: TrainingHistoryItem[],
  max: number = OBSERVATIONS_SHOWN,
) =>
  items
    .filter((item) => (item.review?.observation ?? '').trim() !== '')
    .slice(0, max)

// US-11: lo que se muestra debajo del nombre en "Sesiones por revisar"
export const pendingSessionsLabel = (count: number) =>
  count === 1 ? '1 sesión por revisar' : `${count} sesiones por revisar`

// US-11: debajo del nombre en "Sin peso reciente"; null es que nunca registró su peso
export const lastWeightLabel = (lastRecordedOn: string | null) =>
  lastRecordedOn
    ? `Último registro: ${formatIsoDate(lastRecordedOn)}`
    : 'Nunca registró su peso'
