// opción del selector: una rutina (desde la ficha) o un atleta (desde el detalle de la rutina)
export type AssignOption = {
  value: string
  label: string
  // se ve pero no se puede elegir: la rutina activa o un atleta desactivado
  disabled?: boolean
}

export type AssignRoutineFormValues = {
  // id de la opción elegida; vacío mientras no se elige
  selectedId: string
}
