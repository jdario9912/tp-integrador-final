export const ROUTINE_REQUIRED_MESSAGE = 'Elegí una rutina'
export const ATHLETE_REQUIRED_MESSAGE = 'Elegí un atleta'

// el único campo es el selector: sin opción elegida no se envía
export const validateSelection =
  (requiredMessage: string) =>
  ({ value }: { value: string }) =>
    value ? undefined : requiredMessage
