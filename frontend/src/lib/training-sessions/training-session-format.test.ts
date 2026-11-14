import { describe, expect, it } from 'vitest'
import {
  appDateOf,
  formatDuration,
  formatStartTime,
} from './training-session-format'

describe('appDateOf (US-20)', () => {
  it('da la fecha de la zona de la app, no la de UTC', () => {
    expect(appDateOf('2026-11-12T01:30:00Z')).toBe('2026-11-11')
  })
})

describe('formatDuration (US-20)', () => {
  const start = '2026-11-11T22:15:00Z'

  it('muestra minutos hasta una hora', () => {
    expect(formatDuration(start, '2026-11-11T22:58:00Z')).toBe('43 min')
  })

  it('muestra horas y minutos, y solo horas cuando son exactas', () => {
    expect(formatDuration(start, '2026-11-11T23:20:00Z')).toBe('1 h 5 min')
    expect(formatDuration(start, '2026-11-12T00:15:00Z')).toBe('2 h')
  })

  it('una sesión de menos de un minuto no se muestra como cero', () => {
    expect(formatDuration(start, '2026-11-11T22:15:20Z')).toBe('menos de 1 min')
  })
})

describe('formatStartTime', () => {
  it('muestra la hora de Argentina con reloj de 24 horas', () => {
    expect(formatStartTime('2026-11-11T22:15:03.512345Z')).toBe('19:15')
  })

  it('usa la zona de la app aunque en UTC ya sea el día siguiente', () => {
    expect(formatStartTime('2026-11-12T01:30:00Z')).toBe('22:30')
  })

  it('completa con cero las horas de un dígito', () => {
    expect(formatStartTime('2026-11-12T04:05:00Z')).toBe('01:05')
  })
})
