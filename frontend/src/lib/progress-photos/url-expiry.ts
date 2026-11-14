// margen antes del vencimiento: una URL que vence en 30 s ya se pide de nuevo (contrato, 14)
export const URL_RENEWAL_MARGIN_MS = 30_000

// true si la URL firmada ya venció, o venció dentro del margen
export const isUrlExpired = (urlExpiresAt: string, now = Date.now()) =>
  Date.parse(urlExpiresAt) - URL_RENEWAL_MARGIN_MS <= now
