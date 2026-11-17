import { describe, expect, it } from 'vitest'
import { macroShares } from './macro-share'

describe('macroShares', () => {
  it('reparte los gramos de cada macro sobre el total', () => {
    const shares = macroShares({ proteinG: 50, carbsG: 25, fatG: 25 })

    expect(shares).toEqual({ protein: 0.5, carbs: 0.25, fat: 0.25 })
  })

  it('no hay barra si el día no suma gramos', () => {
    expect(macroShares({ proteinG: 0, carbsG: 0, fatG: 0 })).toBeNull()
  })
})
