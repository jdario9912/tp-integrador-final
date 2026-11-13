import { describe, expect, it } from 'vitest'
import {
  dayTitle,
  formatInProgressSince,
  formatValidity,
} from './my-routine-format'

describe('dayTitle', () => {
  it('arma el título con el número y el nombre del día', () => {
    expect(dayTitle({ dayNumber: 2, name: 'Pierna' })).toBe('Día 2: Pierna')
  })
})

describe('formatValidity', () => {
  it('vigente: hasta qué día, sin correr la fecha por la zona horaria', () => {
    expect(formatValidity({ endDate: '2026-12-28', expired: false })).toBe(
      'Vigente hasta el 28 de diciembre de 2026',
    )
  })

  it('vencida: desde cuándo', () => {
    expect(formatValidity({ endDate: '2026-09-28', expired: true })).toBe(
      'Venció el 28 de septiembre de 2026',
    )
  })

  it('sin duración no vence', () => {
    expect(formatValidity({ endDate: null, expired: false })).toBe(
      'Sin fecha de vencimiento',
    )
  })
})

describe('formatInProgressSince', () => {
  // 22:30 del 11/11 en Argentina: en UTC ya es el 12
  const session = {
    sessionDate: '2026-11-11',
    startedAt: '2026-11-12T01:30:00Z',
  }

  it('si empezó hoy muestra solo la hora, en hora de Argentina', () => {
    expect(formatInProgressSince(session, '2026-11-11')).toBe('desde las 22:30')
  })

  it('si quedó abierto de otro día muestra también la fecha', () => {
    expect(formatInProgressSince(session, '2026-11-12')).toBe(
      'desde el 11 de noviembre de 2026 a las 22:30',
    )
  })
})
