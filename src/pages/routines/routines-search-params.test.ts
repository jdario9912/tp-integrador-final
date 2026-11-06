import { describe, expect, it } from 'vitest'
import {
  parseRoutinesQuery,
  toRoutinesSearchParams,
} from './routines-search-params'

const parse = (query: string) => parseRoutinesQuery(new URLSearchParams(query))

describe('parseRoutinesQuery', () => {
  it('sin parámetros arranca en la página 1', () => {
    expect(parse('')).toEqual({ page: 1 })
  })

  it('lee la página e ignora parámetros desconocidos', () => {
    expect(parse('page=3&name=fuerza')).toEqual({ page: 3 })
  })

  it.each(['abc', '0', '-2', '1.5', ''])(
    'una página inválida (%s) vale 1',
    (page) => {
      expect(parse(`page=${page}`).page).toBe(1)
    },
  )
})

describe('toRoutinesSearchParams', () => {
  it('omite la página 1', () => {
    expect(toRoutinesSearchParams({ page: 1 }).toString()).toBe('')
  })

  it('ida y vuelta conserva la página', () => {
    expect(parseRoutinesQuery(toRoutinesSearchParams({ page: 4 }))).toEqual({
      page: 4,
    })
  })
})
