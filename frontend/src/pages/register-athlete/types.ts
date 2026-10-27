import type { ExperienceLevel, Sex } from '../../lib/athletes'

export type {
  Athlete,
  AthleteStatus,
  ExperienceLevel,
  Sex,
} from '../../lib/athletes'

// sin status ni coachId: arranca activo y queda asignado al entrenador autenticado
export type CreateAthleteInput = {
  firstName: string
  lastName: string
  email: string
  password: string
  phone?: string
  sex?: Sex
  experienceLevel?: ExperienceLevel
  birthDate?: string
  heightCm?: number
  initialWeightKg?: number
  goal?: string
  injuries?: string
  limitations?: string
  availableDays?: number
  startDate?: string
}

// en el formulario todos los campos son strings; los selects vacíos valen ''
export type RegisterAthleteFormValues = {
  [Key in keyof CreateAthleteInput]-?: Key extends 'sex'
    ? Sex | ''
    : Key extends 'experienceLevel'
      ? ExperienceLevel | ''
      : string
}
