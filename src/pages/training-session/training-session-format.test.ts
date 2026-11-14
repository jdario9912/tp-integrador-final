import { describe, expect, it } from 'vitest'
import {
  formatEndedAt,
  formatStartedAt,
  sessionTitle,
} from './training-session-format'

describe('formatEndedAt (US-20)', () => {
  const base = {
    status: 'FINISHED' as const,
    sessionDate: '2026-11-11',
    endedAt: '2026-11-11T23:05:00Z',
  }

  it('en curso no hay hora de fin que mostrar', () => {
    expect(
      formatEndedAt({ ...base, status: 'IN_PROGRESS', endedAt: null }),
    ).toBeNull()
  })

  it('finalizada el mismo día muestra solo la hora', () => {
    expect(formatEndedAt(base)).toBe('Terminaste a las 20:05')
  })

  it('cancelada usa el verbo de cancelar', () => {
    expect(formatEndedAt({ ...base, status: 'CANCELLED' })).toBe(
      'Cancelaste a las 20:05',
    )
  })

  it('si terminó otro día que el de inicio, lo dice con la fecha', () => {
    // 15:00 UTC del 12 son las 12:00 del 12 en Argentina
    expect(formatEndedAt({ ...base, endedAt: '2026-11-12T15:00:00Z' })).toBe(
      'Terminaste el 12 de noviembre de 2026 a las 12:00',
    )
  })
})

describe('sessionTitle', () => {
  it.each([
    ['IN_PROGRESS', 'Entrenamiento en curso'],
    ['FINISHED', 'Entrenamiento finalizado'],
    ['CANCELLED', 'Entrenamiento cancelado'],
  ] as const)('%s → %s', (status, title) => {
    expect(sessionTitle(status)).toBe(title)
  })
})

describe('formatStartedAt', () => {
  const session = {
    sessionDate: '2026-11-11',
    startedAt: '2026-11-11T22:15:03.512345Z',
  }

  it('si empezó hoy muestra solo la hora, en hora de Argentina', () => {
    expect(formatStartedAt(session, '2026-11-11')).toBe(
      'Empezaste hoy a las 19:15',
    )
  })

  it('si quedó abierto de otro día muestra también la fecha', () => {
    expect(formatStartedAt(session, '2026-11-12')).toBe(
      'Empezaste el 11 de noviembre de 2026 a las 19:15',
    )
  })
})
