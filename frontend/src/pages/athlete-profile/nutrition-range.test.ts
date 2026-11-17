import { describe, expect, it } from 'vitest'
import {
  consistencyText,
  formatRange,
  formatWeekday,
  mealCountText,
  shiftDayUntil,
  shiftWeekEnd,
  weekEndingOn,
} from './nutrition-range'

const TODAY = '2026-11-17'

describe('rango de la alimentación (US-25)', () => {
  it('la semana son los 7 días que terminan en la fecha dada', () => {
    expect(weekEndingOn(TODAY)).toEqual({ from: '2026-11-11', to: TODAY })
    // cruza de mes y de año sin depender de la zona horaria
    expect(weekEndingOn('2026-01-03')).toEqual({
      from: '2025-12-28',
      to: '2026-01-03',
    })
  })

  it('navega de a una semana y la siguiente no pasa de hoy', () => {
    expect(shiftWeekEnd(TODAY, -1, TODAY)).toBe('2026-11-10')
    expect(shiftWeekEnd('2026-11-10', 1, TODAY)).toBe(TODAY)
    expect(shiftWeekEnd('2026-11-14', 1, TODAY)).toBe(TODAY)
  })

  it('navega de a un día y el siguiente no pasa de hoy', () => {
    expect(shiftDayUntil(TODAY, -1, TODAY)).toBe('2026-11-16')
    expect(shiftDayUntil(TODAY, 1, TODAY)).toBe(TODAY)
  })

  it('nombra el rango y el día', () => {
    expect(formatRange({ from: '2026-11-11', to: TODAY })).toBe(
      '11 de noviembre al 17 de noviembre de 2026',
    )
    expect(formatRange({ from: '2025-12-28', to: '2026-01-03' })).toBe(
      '28 de diciembre de 2025 al 3 de enero de 2026',
    )
    expect(formatWeekday(TODAY)).toBe('martes, 17 de noviembre')
  })

  it('arma los textos de constancia y comidas', () => {
    expect(consistencyText(3, 7)).toBe('3 de 7 días con comidas')
    expect(consistencyText(1, 1)).toBe('1 de 1 día con comidas')
    expect(mealCountText(0)).toBe('Sin comidas')
    expect(mealCountText(1)).toBe('1 comida')
    expect(mealCountText(3)).toBe('3 comidas')
  })
})
