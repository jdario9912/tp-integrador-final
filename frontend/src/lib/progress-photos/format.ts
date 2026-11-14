// tamaño en megabytes con coma decimal, como el resto de la interfaz: "2,1 MB"
const megabytesFormat = new Intl.NumberFormat('es-AR', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 1,
})

export const formatMegabytes = (bytes: number) =>
  `${megabytesFormat.format(bytes / (1024 * 1024))} MB`
