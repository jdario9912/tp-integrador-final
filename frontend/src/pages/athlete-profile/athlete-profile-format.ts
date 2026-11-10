import type { ExperienceLevel, Sex } from '../../lib/athletes'
import { parseIsoDate } from '../../lib/iso-date'

// nombres en español de los catálogos (contrato de API, 1.6)
export const sexLabels: Record<Sex, string> = {
  MALE: 'Masculino',
  FEMALE: 'Femenino',
  OTHER: 'Otro',
}

export const experienceLevelLabels: Record<ExperienceLevel, string> = {
  BEGINNER: 'Principiante',
  INTERMEDIATE: 'Intermedio',
  ADVANCED: 'Avanzado',
}

// el backend guarda los textos opcionales tal como llegan: "" o solo espacios cuentan como sin dato
export const presentText = (value: string | null) => {
  const trimmed = value?.trim()
  return trimmed ? trimmed : null
}

// años cumplidos a la fecha local de hoy; quien nació un 29/2 los cumple el 1/3 en años no bisiestos
export const ageFromBirthDate = (birthDate: string, today = new Date()) => {
  const { year, month, day } = parseIsoDate(birthDate)
  const todayMonth = today.getMonth() + 1
  const hadBirthday =
    todayMonth > month || (todayMonth === month && today.getDate() >= day)
  return today.getFullYear() - year - (hadBirthday ? 0 : 1)
}

export const formatAge = (age: number) => (age === 1 ? '1 año' : `${age} años`)

const measureFormat = new Intl.NumberFormat('es-AR', {
  maximumFractionDigits: 2,
})

export const formatHeightCm = (cm: number) => `${measureFormat.format(cm)} cm`

export const formatAvailableDays = (days: number) =>
  days === 1 ? '1 día por semana' : `${days} días por semana`
