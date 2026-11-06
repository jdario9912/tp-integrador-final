import { describe, expect, it } from 'vitest'
import {
  formatCreatedAt,
  formatDaysPerWeek,
  formatDurationWeeks,
} from './routine-format'

describe('formatDaysPerWeek', () => {
  it('usa singular para un día y plural para el resto', () => {
    expect(formatDaysPerWeek(1)).toBe('1 día por semana')
    expect(formatDaysPerWeek(7)).toBe('7 días por semana')
  })
})

describe('formatDurationWeeks', () => {
  it('usa singular para una semana y plural para el resto', () => {
    expect(formatDurationWeeks(1)).toBe('1 semana')
    expect(formatDurationWeeks(52)).toBe('52 semanas')
  })
})

describe('formatCreatedAt', () => {
  it('muestra la fecha en castellano', () => {
    // mediodía UTC: es el mismo día en cualquier zona horaria de América y Europa
    expect(formatCreatedAt('2026-11-05T12:00:00Z')).toBe(
      '5 de noviembre de 2026',
    )
  })
})
