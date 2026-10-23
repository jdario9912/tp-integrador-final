import type { CreateCoachInput, RegisterCoachFormValues } from './types'

const optionalValue = (value: string) => value.trim() || undefined

export const toCreateCoachInput = (
  values: RegisterCoachFormValues,
): CreateCoachInput => ({
  firstName: values.firstName.trim(),
  lastName: values.lastName.trim(),
  email: values.email.trim(),
  // la contraseña se envía tal cual: los espacios pueden ser intencionales
  password: values.password,
  phone: optionalValue(values.phone),
  specialty: optionalValue(values.specialty),
  licenseNumber: optionalValue(values.licenseNumber),
  bio: optionalValue(values.bio),
})
