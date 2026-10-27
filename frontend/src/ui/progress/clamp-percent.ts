// porcentaje 0-100 para el ancho/ángulo del indicador
export const clampPercent = (value: number, max: number) =>
  max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0
