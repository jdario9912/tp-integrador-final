import { describe, expect, it } from 'vitest'
import {
  dayParams,
  dayTitle,
  isValidIsoDate,
  resolveDay,
  shiftDay,
} from './day-navigation'

const TODAY = '2026-11-13'

describe('isValidIsoDate', () => {
  it('acepta fechas YYYY-MM-DD que existen', () => {
    expect(isValidIsoDate('2026-11-13')).toBe(true)
    // 2028 es bisiesto
    expect(isValidIsoDate('2028-02-29')).toBe(true)
  })

  it('rechaza formatos que no son YYYY-MM-DD, fechas que no existen y la ausencia del parámetro', () => {
    expect(isValidIsoDate(null)).toBe(false)
    expect(isValidIsoDate('')).toBe(false)
    expect(isValidIsoDate('13/11/2026')).toBe(false)
    expect(isValidIsoDate('2026-1-5')).toBe(false)
    expect(isValidIsoDate('2026-02-31')).toBe(false)
    expect(isValidIsoDate('2027-02-29')).toBe(false)
    expect(isValidIsoDate('2026-13-01')).toBe(false)
  })
})

describe('resolveDay', () => {
  it('muestra la fecha de la URL si es válida y no es futura', () => {
    expect(resolveDay('2026-11-12', TODAY)).toBe('2026-11-12')
    expect(resolveDay(TODAY, TODAY)).toBe(TODAY)
  })

  it('vuelve a hoy sin parámetro, con fecha inválida o con una fecha futura', () => {
    expect(resolveDay(null, TODAY)).toBe(TODAY)
    expect(resolveDay('2026-02-31', TODAY)).toBe(TODAY)
    expect(resolveDay('no-es-fecha', TODAY)).toBe(TODAY)
    expect(resolveDay('2026-11-14', TODAY)).toBe(TODAY)
  })
})

describe('shiftDay', () => {
  it('pasa de un día al anterior y al siguiente, también entre meses y años', () => {
    expect(shiftDay('2026-11-13', -1)).toBe('2026-11-12')
    expect(shiftDay('2026-11-13', 1)).toBe('2026-11-14')
    expect(shiftDay('2026-03-01', -1)).toBe('2026-02-28')
    expect(shiftDay('2027-02-28', 1)).toBe('2027-03-01')
    expect(shiftDay('2026-01-01', -1)).toBe('2025-12-31')
    expect(shiftDay('2028-02-28', 1)).toBe('2028-02-29')
  })
})

describe('dayParams', () => {
  it('hoy no lleva ?date=; otro día sí', () => {
    expect(dayParams(TODAY, TODAY)).toEqual({})
    expect(dayParams('2026-11-12', TODAY)).toEqual({ date: '2026-11-12' })
  })
})

describe('dayTitle', () => {
  it('nombra el día según sea hoy o no', () => {
    expect(dayTitle(TODAY, TODAY)).toBe('Comidas de hoy')
    expect(dayTitle('2026-11-12', TODAY)).toBe('Comidas del día')
  })
})
