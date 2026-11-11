import { normalizeDecimal } from '../../lib/decimal'
import type { NutrientFieldName } from './types'

// validadores espejo del backend (POST y PUT /foods), con los mismos mensajes
type FieldValue = { value: string }

export const FOOD_NAME_MAX_LENGTH = 100
export const NUTRIENT_MAX = 10000

// el control numérico del navegador acepta cosas como "1e3": se pide un decimal simple
const NUMBER_PATTERN = /^-?\d+(\.\d+)?$/
// numeric(7,2) en la base: hasta 2 decimales
const DECIMALS_PATTERN = /^-?\d+(\.\d{1,2})?$/

export const validateFoodName = ({ value }: FieldValue) => {
  const trimmed = value.trim()
  if (!trimmed) return 'El nombre es obligatorio'
  if (trimmed.length > FOOD_NAME_MAX_LENGTH)
    return `El nombre no puede superar los ${FOOD_NAME_MAX_LENGTH} caracteres`
  return undefined
}

type NutrientMessages = {
  required: string
  // solo del cliente: el backend no recibe texto que no sea un número
  notANumber: string
  // la porción tiene que ser mayor a 0; los macros, mayores o iguales
  belowMin: string
  aboveMax: string
  decimals: string
}

const nutrientMessages: Record<NutrientFieldName, NutrientMessages> = {
  referencePortionG: {
    required: 'La porción de referencia es obligatoria',
    notANumber: 'La porción de referencia debe ser un número',
    belowMin: 'La porción de referencia debe ser mayor a 0',
    aboveMax: `La porción de referencia no puede superar ${NUTRIENT_MAX}`,
    decimals: 'La porción de referencia admite hasta 2 decimales',
  },
  caloriesKcal: {
    required: 'Las calorías son obligatorias',
    notANumber: 'Las calorías deben ser un número',
    belowMin: 'Las calorías no pueden ser negativas',
    aboveMax: `Las calorías no pueden superar ${NUTRIENT_MAX}`,
    decimals: 'Las calorías admiten hasta 2 decimales',
  },
  proteinG: {
    required: 'Las proteínas son obligatorias',
    notANumber: 'Las proteínas deben ser un número',
    belowMin: 'Las proteínas no pueden ser negativas',
    aboveMax: `Las proteínas no pueden superar ${NUTRIENT_MAX}`,
    decimals: 'Las proteínas admiten hasta 2 decimales',
  },
  carbsG: {
    required: 'Los carbohidratos son obligatorios',
    notANumber: 'Los carbohidratos deben ser un número',
    belowMin: 'Los carbohidratos no pueden ser negativos',
    aboveMax: `Los carbohidratos no pueden superar ${NUTRIENT_MAX}`,
    decimals: 'Los carbohidratos admiten hasta 2 decimales',
  },
  fatG: {
    required: 'Las grasas son obligatorias',
    notANumber: 'Las grasas deben ser un número',
    belowMin: 'Las grasas no pueden ser negativas',
    aboveMax: `Las grasas no pueden superar ${NUTRIENT_MAX}`,
    decimals: 'Las grasas admiten hasta 2 decimales',
  },
}

const isBelowMin = (field: NutrientFieldName, number: number) =>
  field === 'referencePortionG' ? number <= 0 : number < 0

export const validateNutrient =
  (field: NutrientFieldName) =>
  ({ value }: FieldValue) => {
    const messages = nutrientMessages[field]
    const normalized = normalizeDecimal(value)
    if (!normalized) return messages.required
    if (!NUMBER_PATTERN.test(normalized)) return messages.notANumber
    const number = Number(normalized)
    if (isBelowMin(field, number)) return messages.belowMin
    if (number > NUTRIENT_MAX) return messages.aboveMax
    if (!DECIMALS_PATTERN.test(normalized)) return messages.decimals
    return undefined
  }
