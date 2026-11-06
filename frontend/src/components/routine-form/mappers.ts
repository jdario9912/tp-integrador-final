import type { RoutineInput } from '../../lib/routines'
import type { RoutineFormValues } from './types'

export const emptyRoutineFormValues: RoutineFormValues = {
  name: '',
  goal: '',
  daysPerWeek: '',
  durationWeeks: '',
  description: '',
  isTemplate: false,
}

const optionalText = (value: string) => value.trim() || null

const optionalNumber = (value: string) =>
  value.trim() ? Number(value.trim()) : null

// los opcionales vacíos van en null. Se llama después de validar: los números ya son enteros
export const toRoutineInput = (values: RoutineFormValues): RoutineInput => ({
  name: values.name.trim(),
  description: optionalText(values.description),
  goal: optionalText(values.goal),
  daysPerWeek: optionalNumber(values.daysPerWeek),
  durationWeeks: optionalNumber(values.durationWeeks),
  isTemplate: values.isTemplate,
})
