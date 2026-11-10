import type { MuscleGroupCode } from '../exercises'

// respuesta de /routines: los opcionales sin cargar llegan en null
export type Routine = {
  id: string
  name: string
  description: string | null
  goal: string | null
  daysPerWeek: number | null
  durationWeeks: number | null
  // plantilla: base reutilizable para armar rutinas de distintos atletas
  isTemplate: boolean
  // instante ISO de creación
  createdAt: string
}

// body de POST y PUT /routines: el backend convierte los textos en blanco a null
export type RoutineInput = {
  name: string
  description: string | null
  goal: string | null
  daysPerWeek: number | null
  durationWeeks: number | null
  isTemplate: boolean
}

// ejercicio de un día; nombre y grupo muscular vienen del catálogo
export type RoutineExercise = {
  id: string
  exerciseId: string
  exerciseName: string
  muscleGroup: MuscleGroupCode
  // posición dentro del día, desde 0
  sortOrder: number
  sets: number
  reps: number
  // kg
  recommendedWeight: number | null
  // segundos
  rest: number | null
  // "RIR n" o "RPE n"
  rirRpe: string | null
  techniqueNote: string | null
}

export type RoutineDay = {
  id: string
  // posición dentro de la rutina, desde 1
  dayNumber: number
  name: string
  exercises: RoutineExercise[]
}

// GET /routines/{id} y las respuestas de edición: la rutina con su estructura
export type RoutineDetail = Routine & { days: RoutineDay[] }

// sin id: ítem nuevo. El id de un ejercicio solo vale dentro del día al que ya pertenece
export type RoutineExerciseInput = {
  id?: string
  exerciseId: string
  sets: number
  reps: number
  recommendedWeight: number | null
  rest: number | null
  rirRpe: string | null
  techniqueNote: string | null
}

export type RoutineDayInput = {
  id?: string
  name: string
  exercises: RoutineExerciseInput[]
}

// body de PUT /routines/{id}/days: reemplaza la estructura completa y el orden de los arrays
// define dayNumber y sortOrder
export type RoutineStructureInput = { days: RoutineDayInput[] }
