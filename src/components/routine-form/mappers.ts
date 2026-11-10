import type { Routine, RoutineInput } from '../../lib/routines'
import type { RoutineFormValues } from './types'

export const emptyRoutineFormValues: RoutineFormValues = {
  name: '',
  goal: '',
  daysPerWeek: '',
  durationWeeks: '',
  description: '',
  isTemplate: false,
}

const optionalNumberText = (value: number | null) =>
  value === null ? '' : String(value)

// precarga la edición: los opcionales sin cargar quedan vacíos
export const toRoutineFormValues = (routine: Routine): RoutineFormValues => ({
  name: routine.name,
  goal: routine.goal ?? '',
  daysPerWeek: optionalNumberText(routine.daysPerWeek),
  durationWeeks: optionalNumberText(routine.durationWeeks),
  description: routine.description ?? '',
  isTemplate: routine.isTemplate,
})

const optionalText = (value: string) => value.trim() || null

const optionalNumber = (value: string) =>
  value.trim() ? Number(value.trim()) : null

// los opcionales vacíos van en null: en la edición vaciar un campo borra el dato guardado. Se llama después de validar: los números ya son enteros
export const toRoutineInput = (values: RoutineFormValues): RoutineInput => ({
  name: values.name.trim(),
  description: optionalText(values.description),
  goal: optionalText(values.goal),
  daysPerWeek: optionalNumber(values.daysPerWeek),
  durationWeeks: optionalNumber(values.durationWeeks),
  isTemplate: values.isTemplate,
})
