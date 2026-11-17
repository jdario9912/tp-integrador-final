export type MacroGrams = {
  proteinG: number
  carbsG: number
  fatG: number
}

// reparto de los macros por gramos para la barra. No convierte a kcal (las calcula el backend).
// null si el día no suma gramos: entonces no hay barra que mostrar
export const macroShares = ({ proteinG, carbsG, fatG }: MacroGrams) => {
  const total = proteinG + carbsG + fatG
  if (total <= 0) return null
  return {
    protein: proteinG / total,
    carbs: carbsG / total,
    fat: fatG / total,
  }
}
