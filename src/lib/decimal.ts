// algunos navegadores entregan la coma decimal tal como se escribió
export const normalizeDecimal = (value: string) =>
  value.trim().replace(',', '.')
