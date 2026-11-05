// códigos fijos del backend (GET /muscle-groups), en el orden en que los devuelve
export const MUSCLE_GROUP_CODES = [
  'CHEST',
  'BACK',
  'SHOULDERS',
  'BICEPS',
  'TRICEPS',
  'FOREARMS',
  'ABS',
  'QUADRICEPS',
  'HAMSTRINGS',
  'GLUTES',
  'CALVES',
  'FULL_BODY',
] as const

export type MuscleGroupCode = (typeof MUSCLE_GROUP_CODES)[number]

export type MuscleRegion = 'UPPER' | 'CORE' | 'LOWER' | 'FULL'

export type MuscleGroup = {
  code: MuscleGroupCode
  // nombre en castellano para mostrar ("Pecho")
  name: string
  region: MuscleRegion
}

// respuesta de /exercises; global = del sistema, solo lectura para el entrenador
export type Exercise = {
  id: string
  name: string
  description: string | null
  muscleGroup: MuscleGroupCode
  videoUrl: string | null
  global: boolean
}

// body de POST y PUT /exercises: un opcional en null borra el dato al editar
export type ExerciseInput = {
  name: string
  muscleGroup: MuscleGroupCode
  description: string | null
  videoUrl: string | null
}
