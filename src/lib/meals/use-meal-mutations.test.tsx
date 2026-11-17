import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../api'
import { saveSession } from '../auth'
import { session } from '../../test/auth-fixtures'
import { meal } from '../../test/meal-fixtures'
import { athleteMealsKey } from './meal-keys'
import { createMeal } from './create-meal'
import { deleteMeal } from './delete-meal'
import { putMealReview } from './put-meal-review'
import { updateMeal } from './update-meal'
import type { MealInput } from './types'
import { useCreateMeal } from './use-create-meal'
import { useDeleteMeal } from './use-delete-meal'
import { useMealReview } from './use-meal-review'
import { useUpdateMeal } from './use-update-meal'

vi.mock('./create-meal', () => ({ createMeal: vi.fn() }))
vi.mock('./update-meal', () => ({ updateMeal: vi.fn() }))
vi.mock('./delete-meal', () => ({ deleteMeal: vi.fn() }))
vi.mock('./put-meal-review', () => ({ putMealReview: vi.fn() }))

const athlete = session('ATHLETE')
const ATHLETE_ID = athlete.user.id
const MEAL_ID = meal().id
const input: MealInput = {
  date: '2026-11-13',
  type: 'LUNCH',
  description: 'Milanesa',
  items: [],
}

const setup = <T,>(useHook: () => T) => {
  const client = new QueryClient({
    defaultOptions: { mutations: { retry: false } },
  })
  const invalidate = vi.spyOn(client, 'invalidateQueries')
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  )
  const { result } = renderHook(useHook, { wrapper })
  return { result, invalidate }
}

const expectedKey = { queryKey: athleteMealsKey(ATHLETE_ID, ATHLETE_ID) }

beforeEach(() => {
  vi.mocked(createMeal).mockReset()
  vi.mocked(updateMeal).mockReset()
  vi.mocked(deleteMeal).mockReset()
  vi.mocked(putMealReview).mockReset()
  saveSession(athlete)
})

describe('useCreateMeal', () => {
  it('crea la comida e invalida las comidas del atleta', async () => {
    vi.mocked(createMeal).mockResolvedValue(meal())
    const { result, invalidate } = setup(() => useCreateMeal(ATHLETE_ID))

    await act(async () => {
      await result.current.mutateAsync(input)
    })

    expect(createMeal).toHaveBeenCalledWith(ATHLETE_ID, input)
    expect(invalidate).toHaveBeenCalledWith(expectedKey)
  })

  it('si falla no invalida y propaga el error', async () => {
    const error = new ApiError('No existe el alimento', 404)
    vi.mocked(createMeal).mockRejectedValue(error)
    const { result, invalidate } = setup(() => useCreateMeal(ATHLETE_ID))

    await act(async () => {
      await expect(result.current.mutateAsync(input)).rejects.toBe(error)
    })

    expect(invalidate).not.toHaveBeenCalled()
  })
})

describe('useUpdateMeal', () => {
  it('edita la comida e invalida las comidas del atleta', async () => {
    vi.mocked(updateMeal).mockResolvedValue(meal())
    const { result, invalidate } = setup(() => useUpdateMeal(ATHLETE_ID))

    await act(async () => {
      await result.current.mutateAsync({ mealId: MEAL_ID, input })
    })

    expect(updateMeal).toHaveBeenCalledWith(ATHLETE_ID, MEAL_ID, input)
    expect(invalidate).toHaveBeenCalledWith(expectedKey)
  })

  it('un 404 (la comida ya no existe) también refresca la lista', async () => {
    const error = new ApiError('No existe la comida', 404)
    vi.mocked(updateMeal).mockRejectedValue(error)
    const { result, invalidate } = setup(() => useUpdateMeal(ATHLETE_ID))

    await act(async () => {
      await expect(
        result.current.mutateAsync({ mealId: MEAL_ID, input }),
      ).rejects.toBe(error)
    })

    expect(invalidate).toHaveBeenCalledWith(expectedKey)
  })

  it('un 400 no refresca la lista', async () => {
    const error = new ApiError('La solicitud tiene campos inválidos', 400)
    vi.mocked(updateMeal).mockRejectedValue(error)
    const { result, invalidate } = setup(() => useUpdateMeal(ATHLETE_ID))

    await act(async () => {
      await expect(
        result.current.mutateAsync({ mealId: MEAL_ID, input }),
      ).rejects.toBe(error)
    })

    expect(invalidate).not.toHaveBeenCalled()
  })
})

describe('useDeleteMeal', () => {
  it('borra la comida e invalida las comidas del atleta', async () => {
    vi.mocked(deleteMeal).mockResolvedValue(undefined)
    const { result, invalidate } = setup(() => useDeleteMeal(ATHLETE_ID))

    await act(async () => {
      await result.current.mutateAsync(MEAL_ID)
    })

    expect(deleteMeal).toHaveBeenCalledWith(ATHLETE_ID, MEAL_ID)
    expect(invalidate).toHaveBeenCalledWith(expectedKey)
  })

  it('un 404 (ya borrada) refresca la lista', async () => {
    const error = new ApiError('No existe la comida', 404)
    vi.mocked(deleteMeal).mockRejectedValue(error)
    const { result, invalidate } = setup(() => useDeleteMeal(ATHLETE_ID))

    await act(async () => {
      await expect(result.current.mutateAsync(MEAL_ID)).rejects.toBe(error)
    })

    expect(invalidate).toHaveBeenCalledWith(expectedKey)
  })

  it('un error del servidor no refresca la lista', async () => {
    const error = new ApiError('Ocurrió un error inesperado', 500)
    vi.mocked(deleteMeal).mockRejectedValue(error)
    const { result, invalidate } = setup(() => useDeleteMeal(ATHLETE_ID))

    await act(async () => {
      await expect(result.current.mutateAsync(MEAL_ID)).rejects.toBe(error)
    })

    expect(invalidate).not.toHaveBeenCalled()
  })
})

describe('useMealReview (US-25)', () => {
  it('revisa la comida e invalida las comidas del atleta (día, resumen y rango)', async () => {
    vi.mocked(putMealReview).mockResolvedValue(meal())
    const { result, invalidate } = setup(() => useMealReview(ATHLETE_ID))

    await act(async () => {
      await result.current.mutateAsync({
        mealId: MEAL_ID,
        input: { observation: 'Bien' },
      })
    })

    expect(putMealReview).toHaveBeenCalledWith(ATHLETE_ID, MEAL_ID, {
      observation: 'Bien',
    })
    expect(invalidate).toHaveBeenCalledWith(expectedKey)
  })

  it('si falla no invalida y propaga el error', async () => {
    const error = new ApiError('No podés acceder a este atleta', 403)
    vi.mocked(putMealReview).mockRejectedValue(error)
    const { result, invalidate } = setup(() => useMealReview(ATHLETE_ID))

    await act(async () => {
      await expect(
        result.current.mutateAsync({ mealId: MEAL_ID, input: {} }),
      ).rejects.toBe(error)
    })

    expect(invalidate).not.toHaveBeenCalled()
  })
})
