import type { DeepKeys } from '@tanstack/react-form'
import type { Exercise, MuscleGroupCode } from '../../lib/exercises'

// en el formulario los números son strings; nombre y grupo muscular solo se muestran
export type RoutineExerciseFormValues = {
  // clave local para React: los ítems nuevos todavía no tienen id
  key: string
  // null: ejercicio nuevo, se envía sin id
  id: string | null
  exerciseId: string
  exerciseName: string
  muscleGroup: MuscleGroupCode
  sets: string
  reps: string
  recommendedWeight: string
  rest: string
  rirRpe: string
  techniqueNote: string
}

export type RoutineDayFormValues = {
  key: string
  // null: día nuevo, se envía sin id
  id: string | null
  name: string
  exercises: RoutineExerciseFormValues[]
}

export type RoutineStructureFormValues = { days: RoutineDayFormValues[] }

// rutas de los campos: coinciden con las de los errores del backend (days[0].exercises[1].sets)
export type StructureFieldName = DeepKeys<RoutineStructureFormValues>

// lo que necesita el formulario del ejercicio elegido en el catálogo
export type PickedExercise = Pick<Exercise, 'id' | 'name' | 'muscleGroup'>
