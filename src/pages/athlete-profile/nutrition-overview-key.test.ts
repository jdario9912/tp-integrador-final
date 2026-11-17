import { QueryClient } from '@tanstack/react-query'
import { describe, expect, it } from 'vitest'
import { athleteMealsKey } from '../../lib/meals'
import { nutritionOverviewKey } from './nutrition-overview-key'

const WEEK = { from: '2026-11-11', to: '2026-11-17' }

describe('nutritionOverviewKey (US-25)', () => {
  it('cuelga de las comidas del atleta: invalidarlas invalida también el rango', () => {
    const client = new QueryClient()
    const overview = nutritionOverviewKey('user-1', 'athlete-1', WEEK)
    const otherAthlete = nutritionOverviewKey('user-1', 'athlete-2', WEEK)
    client.setQueryData(overview, {})
    client.setQueryData(otherAthlete, {})

    void client.invalidateQueries({
      queryKey: athleteMealsKey('user-1', 'athlete-1'),
    })

    expect(client.getQueryState(overview)?.isInvalidated).toBe(true)
    expect(client.getQueryState(otherAthlete)?.isInvalidated).toBe(false)
  })

  it('separa cada rango', () => {
    expect(nutritionOverviewKey('user-1', 'athlete-1', WEEK)).not.toEqual(
      nutritionOverviewKey('user-1', 'athlete-1', {
        from: '2026-11-04',
        to: '2026-11-10',
      }),
    )
  })
})
