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

// body de POST /routines: el backend convierte los textos en blanco a null
export type RoutineInput = {
  name: string
  description: string | null
  goal: string | null
  daysPerWeek: number | null
  durationWeeks: number | null
  isTemplate: boolean
}
