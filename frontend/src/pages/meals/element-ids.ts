// ids fijos del formulario de comidas: los usan las etiquetas, el foco y los errores
export const FOOD_SEARCH_ID = 'meal-food-search'
export const DESCRIPTION_ID = 'meal-description'
export const TYPE_GROUP_NAME = 'meal-type'

export const quantityFieldId = (itemKey: string) =>
  `meal-item-${itemKey}-quantity`
