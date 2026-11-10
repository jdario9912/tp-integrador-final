import { put } from '../../../lib/api'
import type {
  RoutineDetail,
  RoutineStructureInput,
} from '../../../lib/routines'

// reemplaza todos los días y ejercicios en una sola llamada y devuelve la rutina con su estructura.
// 404 si un ejercicio no está en el catálogo; 422 si se quita un día o ejercicio con series
// registradas
export const saveRoutineStructure = (
  id: string,
  input: RoutineStructureInput,
) => put<RoutineDetail, RoutineStructureInput>(`/routines/${id}/days`, input)
