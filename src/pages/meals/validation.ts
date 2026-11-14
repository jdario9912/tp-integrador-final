import { normalizeDecimal } from '../../lib/decimal'
import type { MealFormValues } from './types'

// validadores espejo del backend (POST y PUT de comidas, contrato 11.3), con los mismos mensajes
type FieldValue = { value: string }

export const MEAL_DESCRIPTION_MAX_LENGTH = 500
export const MEAL_ITEMS_MAX = 50

// numeric(7,2) en la base: hasta 5 enteros y 2 decimales
const QUANTITY_PATTERN = /^\d{1,5}(\.\d{1,2})?$/

export const NEEDS_CONTENT_MESSAGE =
  'Cargá una descripción o al menos un alimento'

export const validateMealDescription = ({ value }: FieldValue) =>
  value.trim().length > MEAL_DESCRIPTION_MAX_LENGTH
    ? `La descripción no puede superar los ${MEAL_DESCRIPTION_MAX_LENGTH} caracteres`
    : undefined

export const validateMealQuantity = ({ value }: FieldValue) => {
  const normalized = normalizeDecimal(value)
  if (!normalized) return 'La cantidad es obligatoria'
  const grams = Number(normalized)
  if (Number.isNaN(grams)) return 'La cantidad debe ser un número'
  if (grams <= 0) return 'La cantidad debe ser mayor a 0 g'
  if (!QUANTITY_PATTERN.test(normalized))
    return 'La cantidad admite hasta 5 enteros y 2 decimales'
  return undefined
}

// regla cruzada (11.3): descripción o al menos un alimento. Se valida al enviar y el error va al
// bloque de alimentos, que es donde el atleta puede resolverlo
export const validateMealContent = ({ value }: { value: MealFormValues }) => {
  if (value.items.length > MEAL_ITEMS_MAX)
    return {
      fields: {
        items: `Una comida admite hasta ${MEAL_ITEMS_MAX} alimentos`,
      },
    }
  if (!value.description.trim() && value.items.length === 0)
    return { fields: { items: NEEDS_CONTENT_MESSAGE } }
  return undefined
}
