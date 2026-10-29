export type Sex = 'MALE' | 'FEMALE' | 'OTHER'

export type ExperienceLevel = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED'

export type AthleteStatus =
  'ACTIVE' | 'NEEDS_REVIEW' | 'NO_ROUTINE' | 'NO_ACTIVITY' | 'INACTIVE'

// respuesta de /athletes; el backend devuelve null en los opcionales que no se cargaron
export type Athlete = {
  id: string
  coachId: string
  firstName: string
  lastName: string
  email: string
  phone: string | null
  status: AthleteStatus
  // false = cuenta desactivada: no puede iniciar sesión
  active: boolean
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
