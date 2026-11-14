import { normalizeDecimal } from '../../lib/decimal'
import type { Food } from '../../lib/foods'
import type { Meal, MealInput, MealType } from '../../lib/meals'
import type { MealFormValues, MealItemFormValues } from './types'

// contador y no crypto.randomUUID: esa función no existe fuera de HTTPS (la red local de la PC)
let itemSequence = 0
export const newItemKey = () => `item-${++itemSequence}`

// alta: el tipo lo sugiere la hora y el atleta lo puede cambiar
export const emptyMealFormValues = (type: MealType): MealFormValues => ({
  type,
  description: '',
  items: [],
})

// precarga la edición; los ítems reciben una clave nueva porque el formulario es otro
export const toMealFormValues = (meal: Meal): MealFormValues => ({
  type: meal.type,
  description: meal.description ?? '',
  items: meal.items.map((item) => ({
    key: newItemKey(),
    foodId: item.foodId,
    foodName: item.foodName,
    quantityG: String(item.quantityG),
  })),
})

// un alimento nuevo arranca con su porción de referencia: en general basta con confirmarla
export const newItemFormValues = (food: Food): MealItemFormValues => ({
  key: newItemKey(),
  foodId: food.id,
  foodName: food.name,
  quantityG: String(food.referencePortionG),
})

// se llama después de validar. La descripción vacía va en null y el backend recorta el resto
export const toMealInput = (
  values: MealFormValues,
  date: string,
): MealInput => ({
  date,
  type: values.type,
  description: values.description.trim() || null,
  items: values.items.map(({ foodId, quantityG }) => ({
    foodId,
    quantityG: Number(normalizeDecimal(quantityG)),
  })),
})
