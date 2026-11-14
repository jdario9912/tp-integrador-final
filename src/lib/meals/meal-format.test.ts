import { describe, expect, it } from 'vitest'
import {
  formatMealKcal,
  MEAL_TYPE_LABELS,
  MEAL_TYPE_OPTIONS,
  mealTypeLabel,
} from './meal-format'
import { MEAL_TYPES } from './types'

describe('tipos de comida', () => {
  it('tiene un nombre en español para cada código del catálogo', () => {
    expect(Object.keys(MEAL_TYPE_LABELS).sort()).toEqual([...MEAL_TYPES].sort())
    expect(mealTypeLabel('COLLATION')).toBe('Colación')
    expect(mealTypeLabel('PRE_WORKOUT')).toBe('Pre-entrenamiento')
  })

  it('las opciones del selector siguen el orden del catálogo', () => {
    expect(MEAL_TYPE_OPTIONS.map(({ value }) => value)).toEqual([
      'BREAKFAST',
      'LUNCH',
      'SNACK',
      'DINNER',
      'COLLATION',
      'PRE_WORKOUT',
      'POST_WORKOUT',
    ])
  })
})

describe('formatMealKcal', () => {
  it('muestra un guion si la comida no tiene calorías calculadas, nunca 0', () => {
    expect(formatMealKcal(null)).toBe('-')
  })

  it('formatea las calorías con coma decimal', () => {
    expect(formatMealKcal(507.5)).toBe('507,5 kcal')
    expect(formatMealKcal(0)).toBe('0 kcal')
  })
})
