import { describe, expect, it } from 'vitest'
import type { MealFormValues } from './types'
import {
  MEAL_DESCRIPTION_MAX_LENGTH,
  MEAL_ITEMS_MAX,
  NEEDS_CONTENT_MESSAGE,
  validateMealContent,
  validateMealDescription,
  validateMealQuantity,
} from './validation'

const item = { key: 'k1', foodId: 'f1', foodName: 'Arroz', quantityG: '150' }
const values = (overrides: Partial<MealFormValues> = {}): MealFormValues => ({
  type: 'LUNCH',
  description: '',
  items: [],
  ...overrides,
})

describe('validateMealQuantity', () => {
  it.each([
    ['', 'La cantidad es obligatoria'],
    ['0', 'La cantidad debe ser mayor a 0 g'],
    ['-5', 'La cantidad debe ser mayor a 0 g'],
    ['100000', 'La cantidad admite hasta 5 enteros y 2 decimales'],
    ['1.234', 'La cantidad admite hasta 5 enteros y 2 decimales'],
  ])('"%s" → %s', (value, message) => {
    expect(validateMealQuantity({ value })).toBe(message)
  })

  it('acepta enteros, decimales con punto o coma y el máximo', () => {
    expect(validateMealQuantity({ value: '150' })).toBeUndefined()
    expect(validateMealQuantity({ value: '2,5' })).toBeUndefined()
    expect(validateMealQuantity({ value: '99999.99' })).toBeUndefined()
  })
})

describe('validateMealDescription', () => {
  it('pasa hasta el máximo y avisa por encima', () => {
    const max = 'a'.repeat(MEAL_DESCRIPTION_MAX_LENGTH)
    expect(validateMealDescription({ value: max })).toBeUndefined()
    expect(validateMealDescription({ value: `${max}a` })).toBe(
      `La descripción no puede superar los ${MEAL_DESCRIPTION_MAX_LENGTH} caracteres`,
    )
  })

  it('no cuenta los espacios de los extremos', () => {
    const padded = `  ${'a'.repeat(MEAL_DESCRIPTION_MAX_LENGTH)}  `
    expect(validateMealDescription({ value: padded })).toBeUndefined()
  })
})

describe('validateMealContent (descripción o alimentos)', () => {
  it('pide una descripción o al menos un alimento', () => {
    expect(validateMealContent({ value: values() })).toEqual({
      fields: { items: NEEDS_CONTENT_MESSAGE },
    })
    expect(
      validateMealContent({ value: values({ description: '   ' }) }),
    ).toEqual({ fields: { items: NEEDS_CONTENT_MESSAGE } })
  })

  it('acepta solo descripción o solo alimentos', () => {
    expect(
      validateMealContent({ value: values({ description: 'Milanesa' }) }),
    ).toBeUndefined()
    expect(
      validateMealContent({ value: values({ items: [item] }) }),
    ).toBeUndefined()
  })

  it('no admite más de 50 alimentos', () => {
    const many = Array.from({ length: MEAL_ITEMS_MAX + 1 }, (_, i) => ({
      ...item,
      key: `k${i}`,
    }))
    expect(validateMealContent({ value: values({ items: many }) })).toEqual({
      fields: { items: `Una comida admite hasta ${MEAL_ITEMS_MAX} alimentos` },
    })
  })
})
