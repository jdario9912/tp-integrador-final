import type { RoutineDetail } from '../routines'

// la rutina asignada con su estructura: los días y ejercicios tienen la misma forma que en
// GET /routines/{id} (US-14), sin los datos de gestión del entrenador (contrato de API, 9.2)
export type AssignedRoutine = Omit<RoutineDetail, 'isTemplate' | 'createdAt'>

// respuesta de GET /athletes/{athleteId}/routine: la asignación activa del atleta
export type AthleteRoutine = {
  assignmentId: string
  // día de la asignación, YYYY-MM-DD: la rutina rige desde ese día
  assignmentDate: string
  // último día vigente, YYYY-MM-DD; null si la rutina no tiene duración (no vence)
  endDate: string | null
  // lo calcula el backend con el "hoy" de la zona de la app: no se recalcula en el navegador
  expired: boolean
  // día que le toca al atleta (uno de routine.days); null solo si la rutina no tiene días
  nextDayId: string | null
  routine: AssignedRoutine
}
