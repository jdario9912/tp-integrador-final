const weightFormat = new Intl.NumberFormat('es-AR', {
  maximumFractionDigits: 2,
})

// el backend puede mandar 72.5 o 72.50: se formatea como número, con coma decimal
export const formatWeightKg = (kg: number) => `${weightFormat.format(kg)} kg`
