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

// los valores del formulario son los del formulario compartido de atleta
export type { AthleteFormValues as RegisterAthleteFormValues } from '../../components/athlete-form'
