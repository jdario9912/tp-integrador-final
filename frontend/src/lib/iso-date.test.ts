import { describe, expect, it } from 'vitest'
import {
  APP_TIME_ZONE,
  formatIsoDate,
  parseIsoDate,
  todayInAppTimeZone,
} from './iso-date'

describe('parseIsoDate', () => {
  it('separa año, mes (de 1 a 12) y día', () => {
    expect(parseIsoDate('2026-11-06')).toEqual({
      year: 2026,
      month: 11,
      day: 6,
    })
  })
})

describe('formatIsoDate', () => {
  it('muestra la fecha completa en español sin correr el día por la zona horaria', () => {
    expect(formatIsoDate('2000-05-20')).toBe('20 de mayo de 2000')
    expect(formatIsoDate('2026-01-01')).toBe('1 de enero de 2026')
  })
})

describe('todayInAppTimeZone', () => {
  it('usa la zona de Argentina, no la del navegador', () => {
    expect(APP_TIME_ZONE).toBe('America/Argentina/Buenos_Aires')
  })

  // Argentina está en UTC-3: de 21:00 a 23:59 en UTC ya es el día siguiente
  it('a las 23:59 de Argentina sigue siendo el mismo día aunque en UTC sea el siguiente', () => {
    expect(todayInAppTimeZone(new Date('2026-11-07T02:59:59Z'))).toBe(
      '2026-11-06',
    )
  })

  it('a la medianoche de Argentina pasa al día siguiente', () => {
    expect(todayInAppTimeZone(new Date('2026-11-07T03:00:00Z'))).toBe(
      '2026-11-07',
    )
  })

  it('completa mes y día con dos dígitos', () => {
    expect(todayInAppTimeZone(new Date('2026-01-05T15:00:00Z'))).toBe(
      '2026-01-05',
    )
  })

  it('usa la fecha actual por defecto', () => {
    expect(todayInAppTimeZone()).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
})
