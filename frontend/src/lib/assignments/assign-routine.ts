import { post } from '../api'
import type { AssignRoutineInput, RoutineAssignment } from './types'

// 201 con la asignación activa. 409 si hay otra activa y no vino replaceActive; 422 si el atleta
// está desactivado o desvinculado, la rutina está incompleta o ya es la activa
export const assignRoutine = (athleteId: string, input: AssignRoutineInput) =>
  post<RoutineAssignment, AssignRoutineInput>(
    `/athletes/${athleteId}/assignments`,
    input,
  )
