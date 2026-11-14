import { describe, expect, it } from 'vitest'
import { isUrlExpired } from './url-expiry'

const NOW = Date.parse('2026-11-13T20:00:00Z')

describe('isUrlExpired', () => {
  it('una URL que vence dentro de más de 30 s sigue vigente', () => {
    expect(isUrlExpired('2026-11-13T20:01:00Z', NOW)).toBe(false)
  })

  it('una URL que vence en menos de 30 s se trata como vencida', () => {
    expect(isUrlExpired('2026-11-13T20:00:20Z', NOW)).toBe(true)
  })

  it('una URL ya vencida está vencida', () => {
    expect(isUrlExpired('2026-11-13T19:59:00Z', NOW)).toBe(true)
  })
})
