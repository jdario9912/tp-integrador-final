import { describe, expect, it } from 'vitest'
import { formatStartedAt, sessionTitle } from './training-session-format'

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
