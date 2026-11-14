import type { RoutineDay } from '../routines'

// catálogo session_statuses (contrato de API, 10.6). En US-18 toda sesión está IN_PROGRESS;
// FINISHED y CANCELLED los usa US-20 (finalizar o cancelar)
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
