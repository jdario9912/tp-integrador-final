import type { Athlete } from '../../lib/athletes'
import type { AthleteFormValues } from './types'

const text = (value: string | number | null) =>
  value === null ? '' : String(value)

// precarga la edición con los datos del backend: los opcionales sin cargar quedan vacíos
export const toAthleteFormValues = (athlete: Athlete): AthleteFormValues => ({
  firstName: athlete.firstName,
  lastName: athlete.lastName,
  email: athlete.email,
  password: '',
  phone: text(athlete.phone),
  sex: athlete.sex ?? '',
  experienceLevel: athlete.experienceLevel ?? '',
  birthDate: text(athlete.birthDate),
  heightCm: text(athlete.heightCm),
  initialWeightKg: text(athlete.initialWeightKg),
  goal: text(athlete.goal),
  injuries: text(athlete.injuries),
  limitations: text(athlete.limitations),
  availableDays: text(athlete.availableDays),
  startDate: text(athlete.startDate),
})
