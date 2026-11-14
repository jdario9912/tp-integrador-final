// fecha de la foto: es opcional (sin fecha, el backend usa hoy), pero no puede ser futura.
// Las fechas ISO se comparan como strings, igual que en la validación de los pesos
export const validatePhotoTakenOn = (value: string, today: string) => {
  if (value && value > today) return 'La fecha no puede ser futura'
  return undefined
}
