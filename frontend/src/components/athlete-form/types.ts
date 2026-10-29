import type { ExperienceLevel, Sex } from '../../lib/athletes'

// en el formulario todos los campos son strings; los selects vacíos valen ''.
// password solo se muestra en el alta: en la edición queda en '' y no se envía
export type AthleteFormValues = {
  firstName: string
  lastName: string
  email: string
  password: string
  phone: string
  sex: Sex | ''
  experienceLevel: ExperienceLevel | ''
  birthDate: string
  heightCm: string
  initialWeightKg: string
  goal: string
  injuries: string
  limitations: string
  availableDays: string
  startDate: string
}

export type AthleteFieldName = keyof AthleteFormValues
