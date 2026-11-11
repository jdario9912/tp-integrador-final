// en el formulario los números son strings: se convierten al enviar, ya validados
export type FoodFormValues = {
  name: string
  referencePortionG: string
  caloriesKcal: string
  proteinG: string
  carbsG: string
  fatG: string
}

export type FoodFieldName = keyof FoodFormValues

// los valores nutricionales, en el orden en que se muestran
export type NutrientFieldName = Exclude<FoodFieldName, 'name'>
