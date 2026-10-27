import type { CreateAthleteInput, RegisterAthleteFormValues } from './types'

const optionalValue = (value: string) => value.trim() || undefined

// los números se validan antes de enviar, acá solo se convierten
const optionalNumber = (value: string) =>
  value.trim() ? Number(value) : undefined

export const toCreateAthleteInput = (
  values: RegisterAthleteFormValues,
): CreateAthleteInput => ({
  firstName: values.firstName.trim(),
  lastName: values.lastName.trim(),
  email: values.email.trim(),
  // la contraseña se envía tal cual: los espacios pueden ser intencionales
  password: values.password,
  phone: optionalValue(values.phone),
  sex: values.sex || undefined,
  experienceLevel: values.experienceLevel || undefined,
  birthDate: optionalValue(values.birthDate),
  heightCm: optionalNumber(values.heightCm),
  initialWeightKg: optionalNumber(values.initialWeightKg),
  goal: optionalValue(values.goal),
  injuries: optionalValue(values.injuries),
  limitations: optionalValue(values.limitations),
  availableDays: optionalNumber(values.availableDays),
  startDate: optionalValue(values.startDate),
})
