import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import {
  LEGS_DAY_ID,
  TORSO_DAY_ID,
  legsDay,
  torsoDay,
} from '../../../test/athlete-routine-fixtures'
import { useSelectedDay } from './use-selected-day'

describe('useSelectedDay', () => {
  it('arranca en el día que le toca al atleta', () => {
    const { result } = renderHook(() =>
      useSelectedDay([torsoDay(), legsDay()], LEGS_DAY_ID),
    )

    expect(result.current[0]).toBe(LEGS_DAY_ID)
  })

  it('cambia al día elegido', () => {
    const { result } = renderHook(() =>
      useSelectedDay([torsoDay(), legsDay()], TORSO_DAY_ID),
    )

    act(() => result.current[1](LEGS_DAY_ID))

    expect(result.current[0]).toBe(LEGS_DAY_ID)
  })

  it('si el día elegido ya no está en la rutina, vuelve al que toca', () => {
    const { result, rerender } = renderHook(
      ({ days }) => useSelectedDay(days, TORSO_DAY_ID),
      { initialProps: { days: [torsoDay(), legsDay()] } },
    )
    act(() => result.current[1](LEGS_DAY_ID))

    rerender({ days: [torsoDay()] })

    expect(result.current[0]).toBe(TORSO_DAY_ID)
  })

  it('si el que toca no está en la lista, abre el primero', () => {
    const { result } = renderHook(() =>
      useSelectedDay([torsoDay(), legsDay()], 'otro-dia'),
    )

    expect(result.current[0]).toBe(TORSO_DAY_ID)
  })

  it('sin días no hay día seleccionado', () => {
    const { result } = renderHook(() => useSelectedDay([], null))

    expect(result.current[0]).toBeNull()
  })
})
