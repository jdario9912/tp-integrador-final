import type { RoutineDay } from '../routines'

// catálogo session_statuses (contrato de API, 10.6). Finalizar pasa a FINISHED y cancelar a
// CANCELLED (US-20); los dos estados finales no cambian más
export type SessionStatus = 'IN_PROGRESS' | 'FINISHED' | 'CANCELLED'

// TrainingSessionResponse: la misma forma en el POST, en la sesión en progreso y en el detalle (10.2)
export type TrainingSession = {
  id: string
  status: SessionStatus
  // día del entrenamiento, YYYY-MM-DD: la fecha de startedAt en la zona de la app
  sessionDate: string
  // instante de inicio, ISO-8601 en UTC
  startedAt: string
  // asignación en la que se entrena: la que estaba activa al iniciar
  assignmentId: string
  routineId: string
  routineName: string
  // el día con sus ejercicios planificados, el mismo de US-14/US-17. Se lee en vivo: si el
  // entrenador lo edita, la sesión lo muestra en la próxima consulta
  day: RoutineDay
  // series ya registradas (US-19). Lo que no está acá sigue pendiente: no hay estado PENDING
  performedSets: PerformedSet[]
  // hora de fin, ISO-8601 en UTC (US-20). null mientras la sesión está en curso
  endedAt: string | null
  // resumen de las series del día (US-20). Va también en curso: la confirmación de finalizar lo usa
  summary: TrainingSessionSummary
  // devolución del entrenador (US-21). null mientras no la revisó
  review: SessionReview | null
}

// revisión del entrenador sobre una sesión finalizada (US-21, contrato 25). Revisar otra vez
// reemplaza la observación y actualiza la fecha
export type SessionReview = {
  // instante de la revisión, ISO-8601 en UTC
  reviewedAt: string
  // observación para el atleta: null si se revisó sin texto
  observation: string | null
}

// ítem del historial (US-21, contrato 25): liviano, sin series ni ejercicios. El detalle sale de
// GET .../sessions/{sessionId}. Solo sesiones cerradas
export type TrainingHistoryItem = {
  id: string
  sessionDate: string
  status: Exclude<SessionStatus, 'IN_PROGRESS'>
  startedAt: string
  routineName: string
  dayNumber: number
  dayName: string
  // hora de fin: en una sesión cerrada siempre viene
  endedAt: string | null
  summary: TrainingSessionSummary
  review: SessionReview | null
}

// filtros y paginación del historial. from y to son YYYY-MM-DD, inclusivos sobre sessionDate
export type TrainingHistoryQuery = {
  from?: string
  to?: string
  // desde 0
  page?: number
  size?: number
}

// body de PUT .../sessions/{sessionId}/review (US-21): sin observación se marca igual
export type SessionReviewInput = { observation?: string }

// resumen de la sesión (US-20). Pendientes = prescritas sin registrar; el volumen suma peso ×
// repeticiones de las series hechas
export type TrainingSessionSummary = {
  prescribedSets: number
  doneSets: number
  skippedSets: number
  pendingSets: number
  // kg, con hasta 2 decimales
  volumeKg: number
}

// body de POST /athletes/{athleteId}/sessions: la fecha y la hora las pone el backend
export type StartTrainingSessionInput = { routineDayId: string }

// estados de una serie registrada (contrato de API, 11.3 y 11.4). Omitir o corregir es el mismo PUT
export type SetStatus = 'DONE' | 'SKIPPED'

// PerformedSetResponse: una serie de un ejercicio del día, identificada por (ejercicio, número)
export type PerformedSet = {
  id: string
  // id del ejercicio dentro del día (day.exercises[].id), no el del catálogo
  routineExerciseId: string
  // 1..sets del ejercicio
  setNumber: number
  status: SetStatus
  // kg y repeticiones: null si la serie se omitió
  weight: number | null
  reps: number | null
  // esfuerzo de 1 a 10, opcional
  rpe: number | null
  // motivo de la omisión: null si la serie se hizo
  skipReason: string | null
}

// body del PUT de una serie (11.3). Los datos que no aplican al estado se descartan en el backend
export type PerformedSetInput =
  | { status: 'DONE'; weight: number; reps: number; rpe?: number }
  | { status: 'SKIPPED'; skipReason: string }
