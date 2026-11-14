import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { clearSession, saveSession } from '../auth'
import { session } from '../../test/auth-fixtures'
import { meal } from '../../test/meal-fixtures'
import { getMealsOfDay } from './get-meals'
import { mealsOfDayKey } from './meal-keys'
import { useMealsOfDay } from './use-meals-of-day'

vi.mock('./get-meals', () => ({ getMealsOfDay: vi.fn() }))

const athlete = session('ATHLETE')
const ATHLETE_ID = athlete.user.id

const renderWithClient = (athleteId: string, date: string) => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  )
  return renderHook(() => useMealsOfDay(athleteId, date), { wrapper })
}

beforeEach(() => {
  vi.mocked(getMealsOfDay).mockReset()
  saveSession(athlete)
})

describe('useMealsOfDay', () => {
  it('trae las comidas del día y las deja en la caché bajo la clave del día', async () => {
    const meals = [meal()]
    vi.mocked(getMealsOfDay).mockResolvedValue(meals)

    const { result } = renderWithClient(ATHLETE_ID, '2026-11-13')

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toBe(meals)
    expect(getMealsOfDay).toHaveBeenCalledWith(ATHLETE_ID, '2026-11-13')
    expect(mealsOfDayKey(ATHLETE_ID, ATHLETE_ID, '2026-11-13')).toEqual([
      'meals',
      ATHLETE_ID,
      ATHLETE_ID,
      'day',
      '2026-11-13',
    ])
  })

  it('no pide nada sin sesión', () => {
    clearSession()
    renderWithClient(ATHLETE_ID, '2026-11-13')
    expect(getMealsOfDay).not.toHaveBeenCalled()
  })
})
