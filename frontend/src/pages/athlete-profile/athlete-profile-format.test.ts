import { describe, expect, it } from 'vitest'
import {
  ageFromBirthDate,
  experienceLevelLabels,
  formatAge,
  formatAvailableDays,
  formatHeightCm,
  presentText,
  sexLabels,
} from './athlete-profile-format'

// fecha local al mediodía, con el mes de 1 a 12
const localDate = (year: number, month: number, day: number) =>
  new Date(year, month - 1, day, 12)

describe('presentText', () => {
  it.each([
    [null, null],
    ['', null],
    ['   ', null],
    ['\n\t', null],
    ['  Hipertrofia ', 'Hipertrofia'],
  ])('%j → %j', (value, expected) => {
    expect(presentText(value)).toBe(expected)
  })
})

describe('ageFromBirthDate', () => {
  it('cuenta el año recién después del cumpleaños', () => {
    expect(ageFromBirthDate('2000-05-20', localDate(2026, 5, 19))).toBe(25)
    expect(ageFromBirthDate('2000-05-20', localDate(2026, 5, 20))).toBe(26)
    expect(ageFromBirthDate('2000-05-20', localDate(2026, 12, 31))).toBe(26)
    expect(ageFromBirthDate('2000-05-20', localDate(2027, 1, 1))).toBe(26)
  })

  it('compara el mes antes que el día', () => {
    expect(ageFromBirthDate('1990-03-31', localDate(2026, 4, 1))).toBe(36)
    expect(ageFromBirthDate('1990-11-01', localDate(2026, 10, 31))).toBe(35)
  })

  it('un 29 de febrero cumple el 1 de marzo en los años no bisiestos', () => {
    expect(ageFromBirthDate('2004-02-29', localDate(2026, 2, 28))).toBe(21)
    expect(ageFromBirthDate('2004-02-29', localDate(2026, 3, 1))).toBe(22)
    expect(ageFromBirthDate('2004-02-29', localDate(2028, 2, 29))).toBe(24)
  })

  it('usa la fecha de hoy por defecto', () => {
    const today = new Date()
    expect(ageFromBirthDate(`${today.getFullYear() - 30}-01-01`)).toBe(30)
  })
})

describe('formatos', () => {
  it('edad en singular y plural', () => {
    expect(formatAge(1)).toBe('1 año')
    expect(formatAge(34)).toBe('34 años')
  })

  it('altura con coma decimal y su unidad', () => {
    expect(formatHeightCm(178.5)).toBe('178,5 cm')
    expect(formatHeightCm(180)).toBe('180 cm')
  })

  it('días disponibles en singular y plural', () => {
    expect(formatAvailableDays(1)).toBe('1 día por semana')
    expect(formatAvailableDays(4)).toBe('4 días por semana')
  })

  it('catálogos en español', () => {
    expect(sexLabels).toEqual({
      MALE: 'Masculino',
      FEMALE: 'Femenino',
      OTHER: 'Otro',
    })
    expect(experienceLevelLabels).toEqual({
      BEGINNER: 'Principiante',
      INTERMEDIATE: 'Intermedio',
      ADVANCED: 'Avanzado',
    })
  })
})
