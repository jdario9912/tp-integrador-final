import type { ExperienceLevel, Sex } from '../../lib/athletes'

// PUT: edición completa, un opcional en null borra el dato. Sin password (la cambia el atleta),
// status ni coachId
export type UpdateAthleteInput = {
  firstName: string
  lastName: string
  email: string
  phone: string | null
  sex: Sex | null
  experienceLevel: ExperienceLevel | null
  birthDate: string | null
  heightCm: number | null
  initialWeightKg: number | null
  goal: string | null
  injuries: string | null
  limitations: string | null
  availableDays: number | null
  startDate: string | null
}
