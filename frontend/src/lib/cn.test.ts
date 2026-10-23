import { describe, expect, it } from 'vitest'
import { cn } from './cn'

describe('cn', () => {
  it('combina clases condicionales', () => {
    const isHidden = false
    expect(cn('px-2', isHidden && 'hidden', { 'font-bold': true })).toBe(
      'px-2 font-bold',
    )
  })

  it('resuelve conflictos de tailwind priorizando la última clase', () => {
    expect(cn('px-2 py-1', 'px-4')).toBe('py-1 px-4')
  })

  it('no confunde tokens de color con tamaños de fuente', () => {
    expect(cn('text-sm text-primary-foreground', 'text-foreground')).toBe(
      'text-sm text-foreground',
    )
  })
})
