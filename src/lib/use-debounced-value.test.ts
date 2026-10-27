import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useDebouncedValue } from './use-debounced-value'

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('useDebouncedValue', () => {
  it('devuelve el valor inicial de inmediato', () => {
    const { result } = renderHook(() => useDebouncedValue('ana'))

    expect(result.current).toBe('ana')
  })

  it('actualiza el valor recién después del delay', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebouncedValue(value, 300),
      { initialProps: { value: '' } },
    )

    rerender({ value: 'ana' })
    act(() => vi.advanceTimersByTime(299))
    expect(result.current).toBe('')

    act(() => vi.advanceTimersByTime(1))
    expect(result.current).toBe('ana')
  })

  it('reinicia la espera si el valor cambia antes del delay', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebouncedValue(value, 300),
      { initialProps: { value: '' } },
    )

    rerender({ value: 'a' })
    act(() => vi.advanceTimersByTime(200))
    rerender({ value: 'an' })
    act(() => vi.advanceTimersByTime(200))
    expect(result.current).toBe('')

    act(() => vi.advanceTimersByTime(100))
    expect(result.current).toBe('an')
  })
})
