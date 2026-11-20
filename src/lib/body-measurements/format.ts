const valueFormat = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 2 })

// valor de una medida con su unidad: "84,5 cm", "18,25 %". Coma decimal, como el resto de la app
export const formatBodyMeasurementValue = (value: number, unit: string) =>
  `${valueFormat.format(value)} ${unit}`
