import { describe, expect, it } from 'vitest'
import { createdFood } from '../../test/food-fixtures'
import { toFoodFormValues, toFoodInput } from './mappers'

describe('toFoodFormValues', () => {
  it('precarga los números como texto', () => {
    expect(toFoodFormValues(createdFood())).toEqual({
      name: 'Manzana',
      referencePortionG: '100',
      caloriesKcal: '52',
      proteinG: '0.3',
      carbsG: '14',
      fatG: '0.2',
    })
  })
})

describe('toFoodInput', () => {
  it('recorta el nombre y convierte los números, aceptando la coma decimal', () => {
    expect(
      toFoodInput({
        name: '  Pechuga de pollo ',
        referencePortionG: '100',
        caloriesKcal: ' 165 ',
        proteinG: '31',
        carbsG: '0',
        fatG: '3,6',
      }),
    ).toEqual({
      name: 'Pechuga de pollo',
      referencePortionG: 100,
      caloriesKcal: 165,
      proteinG: 31,
      carbsG: 0,
      fatG: 3.6,
    })
  })

  it('ida y vuelta conserva el alimento', () => {
    const { id: _id, ...input } = createdFood()

    expect(toFoodInput(toFoodFormValues(createdFood()))).toEqual(input)
  })
})
