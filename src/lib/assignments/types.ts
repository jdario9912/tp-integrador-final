// asignación de una rutina a un atleta (RoutineAssignment del UML). Un atleta tiene a lo sumo
// una activa; las anteriores quedan inactivas como historial
export type RoutineAssignment = {
  id: string
  routineId: string
  routineName: string
  // día de la asignación en la zona de la app, YYYY-MM-DD
  assignmentDate: string
  active: boolean
}

// body de POST /athletes/{athleteId}/assignments. Sin replaceActive (o en false) el backend
// responde 409 si el atleta ya tiene otra rutina activa
export type AssignRoutineInput = {
  routineId: string
  replaceActive: boolean
}

// query params del historial: el orden es fijo (la activa primero, después por fecha descendente)
export type AssignmentsQuery = {
  // desde 0
  page?: number
  size?: number
}
