import { normalizeDecimal } from '../../lib/decimal'
import type { Food, FoodInput } from '../../lib/foods'
import type { FoodFormValues } from './types'

export const emptyFoodFormValues: FoodFormValues = {
  name: '',
  referencePortionG: '',
  caloriesKcal: '',
  proteinG: '',
  carbsG: '',
  fatG: '',
}

// precarga la edición
export const toFoodFormValues = (food: Food): FoodFormValues => ({
  name: food.name,
  referencePortionG: String(food.referencePortionG),
  caloriesKcal: String(food.caloriesKcal),
  proteinG: String(food.proteinG),
  carbsG: String(food.carbsG),
  fatG: String(food.fatG),
})

const toNumber = (value: string) => Number(normalizeDecimal(value))

// se llama después de validar: los números ya son válidos
export const toFoodInput = (values: FoodFormValues): FoodInput => ({
  name: values.name.trim(),
  referencePortionG: toNumber(values.referencePortionG),
  caloriesKcal: toNumber(values.caloriesKcal),
  proteinG: toNumber(values.proteinG),
  carbsG: toNumber(values.carbsG),
  fatG: toNumber(values.fatG),
})
