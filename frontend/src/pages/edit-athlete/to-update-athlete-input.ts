import type { AthleteFormValues } from '../../components/athlete-form'
import type { UpdateAthleteInput } from './types'

// null y no undefined: en la edición vaciar un campo tiene que borrar el dato guardado
const optionalValue = (value: string) => value.trim() || null

// los números se validan antes de enviar, acá solo se convierten
const optionalNumber = (value: string) => (value.trim() ? Number(value) : null)

export const toUpdateAthleteInput = (
  values: AthleteFormValues,
): UpdateAthleteInput => ({
  firstName: values.firstName.trim(),
  lastName: values.lastName.trim(),
  email: values.email.trim(),
  phone: optionalValue(values.phone),
  sex: values.sex || null,
  experienceLevel: values.experienceLevel || null,
  birthDate: optionalValue(values.birthDate),
  heightCm: optionalNumber(values.heightCm),
  initialWeightKg: optionalNumber(values.initialWeightKg),
  goal: optionalValue(values.goal),
  injuries: optionalValue(values.injuries),
  limitations: optionalValue(values.limitations),
  availableDays: optionalNumber(values.availableDays),
  startDate: optionalValue(values.startDate),
})
