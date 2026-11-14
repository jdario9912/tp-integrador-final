import { describe, expect, it } from 'vitest'
import type { Food } from '../../lib/foods'
import { meal, mealItem } from '../../test/meal-fixtures'
import {
  emptyMealFormValues,
  newItemFormValues,
  toMealFormValues,
  toMealInput,
} from './meal-form-values'

const food: Food = {
  id: 'f-arroz',
  name: 'Arroz blanco cocido',
  referencePortionG: 100,
  caloriesKcal: 130,
  proteinG: 2.7,
  carbsG: 28,
  fatG: 0.3,
}

describe('valores del formulario', () => {
  it('el alta arranca vacía con el tipo sugerido', () => {
    expect(emptyMealFormValues('SNACK')).toEqual({
      type: 'SNACK',
      description: '',
      items: [],
    })
  })

  it('un alimento nuevo arranca con su porción de referencia', () => {
    expect(newItemFormValues(food)).toMatchObject({
      foodId: 'f-arroz',
      foodName: 'Arroz blanco cocido',
      quantityG: '100',
    })
  })

  it('la edición precarga tipo, descripción y alimentos con su cantidad', () => {
    const values = toMealFormValues(
      meal({
        type: 'DINNER',
        description: null,
        items: [mealItem({ quantityG: 150.5 })],
      }),
    )
    expect(values.type).toBe('DINNER')
    expect(values.description).toBe('')
    expect(values.items).toHaveLength(1)
    expect(values.items[0]).toMatchObject({
      foodName: 'Pechuga de pollo cocida',
      quantityG: '150.5',
    })
    expect(values.items[0].key).toBeTruthy()
  })
})

describe('toMealInput', () => {
  it('arma el body con la fecha dada, la descripción recortada y las cantidades numéricas', () => {
    const input = toMealInput(
      {
        type: 'LUNCH',
        description: '  Milanesa con ensalada  ',
        items: [
          { key: 'a', foodId: 'f-arroz', foodName: 'Arroz', quantityG: '2,5' },
        ],
      },
      '2026-11-13',
    )
    expect(input).toEqual({
      date: '2026-11-13',
      type: 'LUNCH',
      description: 'Milanesa con ensalada',
      items: [{ foodId: 'f-arroz', quantityG: 2.5 }],
    })
  })

  it('una descripción vacía o en blanco va como null, sin ítems va []', () => {
    expect(
      toMealInput(
        { type: 'COLLATION', description: '   ', items: [] },
        '2026-11-13',
      ),
    ).toEqual({
      date: '2026-11-13',
      type: 'COLLATION',
      description: null,
      items: [],
    })
  })
})
