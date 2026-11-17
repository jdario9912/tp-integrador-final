import { describe, expect, it } from 'vitest'
import {
  athleteRoutine,
  LEGS_DAY_ID,
  torsoDay,
} from '../../test/athlete-routine-fixtures'
import { trainingHistoryItem } from '../../test/training-session-fixtures'
import { dayTitle, latestObservations, nextDayOf } from './dashboard-format'

describe('nextDayOf', () => {
  it('devuelve el día que indica nextDayId', () => {
    const routine = athleteRoutine({ nextDayId: LEGS_DAY_ID })

    expect(nextDayOf(routine)?.name).toBe('Pierna')
  })

  it('null si nextDayId no es un día de la rutina', () => {
    expect(nextDayOf(athleteRoutine({ nextDayId: null }))).toBeNull()
  })
})

describe('dayTitle', () => {
  it('arma "Día N: nombre"', () => {
    expect(dayTitle(torsoDay())).toBe('Día 1: Torso')
  })
})

describe('latestObservations', () => {
  const withObservation = (id: string, observation: string | null) =>
    trainingHistoryItem({
      id,
      review: { reviewedAt: '2026-11-12T10:00:00Z', observation },
    })

  it('deja solo las sesiones revisadas con texto, en el orden recibido', () => {
    const items = [
      trainingHistoryItem({ id: 'sin-revisar', review: null }),
      withObservation('con-texto-1', 'Buen trabajo'),
      withObservation('revisada-sin-texto', null),
      withObservation('solo-espacios', '   '),
      withObservation('con-texto-2', 'Subí el peso'),
    ]

    expect(latestObservations(items).map((item) => item.id)).toEqual([
      'con-texto-1',
      'con-texto-2',
    ])
  })

  it('muestra como máximo 3', () => {
    const items = ['a', 'b', 'c', 'd'].map((id) => withObservation(id, 'nota'))

    expect(latestObservations(items)).toHaveLength(3)
  })

  it('sin observaciones devuelve lista vacía', () => {
    expect(latestObservations([trainingHistoryItem()])).toEqual([])
  })
})
