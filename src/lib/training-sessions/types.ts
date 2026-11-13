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
}

// body de POST /athletes/{athleteId}/sessions: la fecha y la hora las pone el backend
export type StartTrainingSessionInput = { routineDayId: string }
