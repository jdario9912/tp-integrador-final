import { describe, expect, it } from 'vitest'
import {
  formatCreatedAt,
  formatDaysPerWeek,
  formatDurationWeeks,
  formatExercisesCount,
  formatRest,
  formatSetsReps,
  formatWeight,
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

describe('formatExercisesCount', () => {
  it('usa singular para un ejercicio y plural para el resto', () => {
    expect(formatExercisesCount(0)).toBe('0 ejercicios')
    expect(formatExercisesCount(1)).toBe('1 ejercicio')
    expect(formatExercisesCount(5)).toBe('5 ejercicios')
  })
})

describe('formatSetsReps', () => {
  it('muestra series por repeticiones', () => {
    expect(formatSetsReps(4, 10)).toBe('4 × 10')
  })
})

describe('formatWeight', () => {
  it('usa coma decimal y omite los decimales en cero', () => {
    expect(formatWeight(80)).toBe('80 kg')
    expect(formatWeight(82.5)).toBe('82,5 kg')
    expect(formatWeight(0)).toBe('0 kg')
  })
})

describe('formatRest', () => {
  it.each([
    [0, '0 s'],
    [45, '45 s'],
    [60, '1 min'],
    [90, '1 min 30 s'],
    [180, '3 min'],
  ])('%i segundos se muestran como %j', (seconds, expected) => {
    expect(formatRest(seconds)).toBe(expected)
  })
})
