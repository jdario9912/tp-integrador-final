import { describe, expect, it } from 'vitest'
import {
  isValidIsoDate,
  presetOf,
  rangeFromSearchParams,
  rangeOfPreset,
  validateRange,
} from './weight-range'

const TODAY = '2026-11-06'

describe('rangeOfPreset', () => {
  it('arma los atajos hasta hoy, con inicio N días o meses antes', () => {
    expect(rangeOfPreset('30d', TODAY)).toEqual({
      from: '2026-10-07',
      to: TODAY,
    })
    expect(rangeOfPreset('3m', TODAY)).toEqual({
      from: '2026-08-06',
      to: TODAY,
    })
    expect(rangeOfPreset('6m', TODAY)).toEqual({
      from: '2026-05-06',
      to: TODAY,
    })
    expect(rangeOfPreset('1y', TODAY)).toEqual({
      from: '2025-11-06',
      to: TODAY,
    })
  })

  it('"Todo" no pone límites', () => {
    expect(rangeOfPreset('all', TODAY)).toEqual({})
  })

  it('si el día no existe en el mes destino, usa el último (31 de mayo − 3 meses = 28 de febrero)', () => {
    expect(rangeOfPreset('3m', '2026-05-31').from).toBe('2026-02-28')
  })

  it('cruza el año bien', () => {
    expect(rangeOfPreset('3m', '2027-02-10').from).toBe('2026-11-10')
  })
})

describe('presetOf', () => {
  it('sin fechas es "Todo"', () => {
    expect(presetOf({}, TODAY)).toBe('all')
  })

  it('reconoce el atajo que corresponde a hoy', () => {
    expect(presetOf(rangeOfPreset('3m', TODAY), TODAY)).toBe('3m')
    expect(presetOf(rangeOfPreset('30d', TODAY), TODAY)).toBe('30d')
  })

  it('cualquier otro rango es personalizado, también uno abierto de un lado', () => {
    expect(presetOf({ from: '2026-01-01', to: TODAY }, TODAY)).toBe('custom')
    expect(presetOf({ from: '2026-10-07' }, TODAY)).toBe('custom')
  })

  it('un atajo de otro día ya no coincide (el rango de la URL es fijo)', () => {
    expect(presetOf(rangeOfPreset('30d', '2026-11-05'), TODAY)).toBe('custom')
  })
})

describe('isValidIsoDate', () => {
  it('acepta fechas que existen', () => {
    expect(isValidIsoDate('2026-11-06')).toBe(true)
    expect(isValidIsoDate('2028-02-29')).toBe(true)
  })

  it('rechaza formato distinto y fechas inexistentes', () => {
    expect(isValidIsoDate('2026/11/06')).toBe(false)
    expect(isValidIsoDate('06-11-2026')).toBe(false)
    expect(isValidIsoDate('2026-02-30')).toBe(false)
    expect(isValidIsoDate('2026-13-01')).toBe(false)
    expect(isValidIsoDate('abc')).toBe(false)
  })
})

describe('validateRange', () => {
  it('acepta rangos cerrados, de un solo día y abiertos de un lado', () => {
    expect(
      validateRange({ from: '2026-10-01', to: '2026-11-01' }),
    ).toBeUndefined()
    expect(
      validateRange({ from: '2026-11-01', to: '2026-11-01' }),
    ).toBeUndefined()
    expect(validateRange({ from: '2026-10-01' })).toBeUndefined()
    expect(validateRange({ to: '2026-10-01' })).toBeUndefined()
    expect(validateRange({})).toBeUndefined()
  })

  it('"desde" posterior a "hasta" se marca en el campo desde, con el texto del backend', () => {
    expect(validateRange({ from: '2026-11-02', to: '2026-11-01' })).toEqual({
      field: 'from',
      message: 'La fecha desde no puede ser posterior a la fecha hasta',
    })
  })

  it('una fecha inválida se marca en su campo', () => {
    expect(validateRange({ from: '2026-02-30' })).toEqual({
      field: 'from',
      message: 'La fecha desde no es válida',
    })
    expect(validateRange({ to: 'mañana' })).toEqual({
      field: 'to',
      message: 'La fecha hasta no es válida',
    })
  })
})

describe('rangeFromSearchParams', () => {
  it('lee from y to, y trata los vacíos como ausentes', () => {
    expect(
      rangeFromSearchParams(new URLSearchParams('from=2026-10-01&to=')),
    ).toEqual({ from: '2026-10-01', to: undefined })
    expect(rangeFromSearchParams(new URLSearchParams(''))).toEqual({
      from: undefined,
      to: undefined,
    })
  })
})
