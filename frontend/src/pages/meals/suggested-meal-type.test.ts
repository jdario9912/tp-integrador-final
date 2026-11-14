import { describe, expect, it } from 'vitest'
import { hourInAppTimeZone, suggestedMealType } from './suggested-meal-type'

describe('suggestedMealType', () => {
  it.each([
    [0, 'BREAKFAST'],
    [10, 'BREAKFAST'],
    [11, 'LUNCH'],
    [14, 'LUNCH'],
    [15, 'SNACK'],
    [18, 'SNACK'],
    [19, 'DINNER'],
    [23, 'DINNER'],
  ] as const)('a las %i h sugiere %s', (hour, type) => {
    expect(suggestedMealType(hour)).toBe(type)
  })
})

describe('hourInAppTimeZone', () => {
  it('lee la hora en la zona de la app, no en la del navegador', () => {
    // 02:30 UTC del 14 de noviembre es las 23:30 del 13 en Argentina (UTC-3)
    expect(hourInAppTimeZone(new Date('2026-11-14T02:30:00Z'))).toBe(23)
    // medianoche en Argentina: 0, nunca 24
    expect(hourInAppTimeZone(new Date('2026-11-13T03:00:00Z'))).toBe(0)
  })
})
