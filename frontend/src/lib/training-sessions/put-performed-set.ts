import { put } from '../api'
import type { PerformedSetInput, TrainingSession } from './types'

// la serie se identifica por la URL: crear, corregir u omitir es el mismo PUT (contrato 11.2).
// Reintentar con el mismo cuerpo y la misma URL no duplica nada
export type PerformedSetTarget = {
  athleteId: string
  sessionId: string
  // id del ejercicio dentro del día (day.exercises[].id)
  routineExerciseId: string
  setNumber: number
}

// 200 con la sesión completa, con performedSets (11.4). 409 si ya no está en curso, 422 si el
// ejercicio no es del día o la serie no existe, 400 si el cuerpo no cumple las reglas por estado
export const putPerformedSet = (
  { athleteId, sessionId, routineExerciseId, setNumber }: PerformedSetTarget,
  input: PerformedSetInput,
) =>
  put<TrainingSession, PerformedSetInput>(
    `/athletes/${athleteId}/sessions/${sessionId}/exercises/${routineExerciseId}/sets/${setNumber}`,
    input,
  )
