import { QueryClient } from '@tanstack/react-query'
import { describe, expect, it } from 'vitest'
import { athleteMealsKey, mealsOfDayKey } from '../../lib/meals'
import { dailySummaryKey } from './summary-key'

describe('dailySummaryKey', () => {
  it('cuelga de las comidas del atleta: invalidar las comidas invalida también el resumen', () => {
    const client = new QueryClient()
    const summary = dailySummaryKey('user-1', 'athlete-1', '2026-11-12')
    const otherAthlete = dailySummaryKey('user-1', 'athlete-2', '2026-11-12')
    client.setQueryData(summary, {})
    client.setQueryData(mealsOfDayKey('user-1', 'athlete-1', '2026-11-12'), [])
    client.setQueryData(otherAthlete, {})

    void client.invalidateQueries({
      queryKey: athleteMealsKey('user-1', 'athlete-1'),
    })

    expect(client.getQueryState(summary)?.isInvalidated).toBe(true)
    expect(client.getQueryState(otherAthlete)?.isInvalidated).toBe(false)
  })

  it('separa el resumen de cada día', () => {
    expect(dailySummaryKey('user-1', 'athlete-1', '2026-11-12')).not.toEqual(
      dailySummaryKey('user-1', 'athlete-1', '2026-11-13'),
    )
  })
})
