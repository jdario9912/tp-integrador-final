const nutrientFormat = new Intl.NumberFormat('es-AR', {
  maximumFractionDigits: 2,
})

// el backend puede mandar 2.5 o 2.50: se formatea como número, con coma decimal
export const formatGrams = (grams: number) =>
  `${nutrientFormat.format(grams)} g`

export const formatKcal = (kcal: number) =>
  `${nutrientFormat.format(kcal)} kcal`
