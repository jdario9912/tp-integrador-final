export type Sex = 'MALE' | 'FEMALE' | 'OTHER'

export type ExperienceLevel = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED'

export type AthleteStatus =
  'ACTIVE' | 'NEEDS_REVIEW' | 'NO_ROUTINE' | 'NO_ACTIVITY' | 'INACTIVE'

// respuesta de POST /athletes; el backend devuelve null en los opcionales que no se enviaron
export type Athlete = {
  id: string
  coachId: string
  firstName: string
  lastName: string
  email: string
  phone: string | null
  status: AthleteStatus
  sex: Sex | null
  experienceLevel: ExperienceLevel | null
  // fechas en formato YYYY-MM-DD
  birthDate: string | null
  heightCm: number | null
  initialWeightKg: number | null
  goal: string | null
  injuries: string | null
  limitations: string | null
  availableDays: number | null
  startDate: string | null
  createdAt: string
}

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
