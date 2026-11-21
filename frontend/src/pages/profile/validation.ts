// la confirmación debe repetir la nueva contraseña exacta (los espacios cuentan)
export const validateConfirmPassword = (value: string, newPassword: string) => {
  if (!value) return 'Repetí la contraseña nueva'
  if (value !== newPassword) return 'Las contraseñas no coinciden'
  return undefined
}

export const validateCurrentPassword = ({ value }: { value: string }) =>
  value ? undefined : 'Ingresá tu contraseña actual'
