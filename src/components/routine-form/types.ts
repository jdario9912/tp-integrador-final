// en el formulario los campos de texto y los números son strings; la plantilla es un checkbox
export type RoutineFormValues = {
  name: string
  goal: string
  daysPerWeek: string
  durationWeeks: string
  description: string
  isTemplate: boolean
}

export type RoutineFieldName = keyof RoutineFormValues
