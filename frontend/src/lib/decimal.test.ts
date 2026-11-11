import { describe, expect, it } from 'vitest'
import { normalizeDecimal } from './decimal'

describe('normalizeDecimal', () => {
  it('recorta y usa punto decimal', () => {
    expect(normalizeDecimal(' 72,5 ')).toBe('72.5')
    expect(normalizeDecimal('72.5')).toBe('72.5')
  })
})
