import { describe, expect, it } from 'vitest'
import { formatStartTime } from './training-session-format'

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
