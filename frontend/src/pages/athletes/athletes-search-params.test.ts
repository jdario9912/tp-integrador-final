import { describe, expect, it } from 'vitest'
import {
  parseAthleteFilters,
  toAthleteSearchParams,
} from './athletes-search-params'

const parse = (query: string) => parseAthleteFilters(new URLSearchParams(query))

describe('parseAthleteFilters', () => {
  it('sin parámetros arranca en la página 1 y sin filtros', () => {
    expect(parse('')).toEqual({ page: 1, name: undefined, goal: undefined })
  })

  it('lee la página y los filtros', () => {
    expect(parse('page=3&name=Juana&goal=fuerza')).toEqual({
      page: 3,
      name: 'Juana',
      goal: 'fuerza',
    })
  })

  it.each(['abc', '0', '-2', '1.5', ''])(
    'una página inválida (%s) vale 1',
    (page) => {
      expect(parse(`page=${page}`).page).toBe(1)
    },
  )

  it('recorta espacios y descarta filtros en blanco', () => {
    expect(parse('name=%20%20Juana%20&goal=%20%20')).toEqual({
      page: 1,
      name: 'Juana',
      goal: undefined,
    })
  })

  it('corta los filtros al largo máximo que acepta el backend', () => {
    const filters = parse(`name=${'a'.repeat(150)}&goal=${'b'.repeat(300)}`)

    expect(filters.name).toHaveLength(100)
    expect(filters.goal).toHaveLength(255)
  })
})

describe('toAthleteSearchParams', () => {
  it('omite la página 1 y los filtros vacíos', () => {
    expect(
      toAthleteSearchParams({ page: 1, name: '', goal: '  ' }).toString(),
    ).toBe('')
  })

  it('incluye los filtros y la página', () => {
    expect(
      toAthleteSearchParams({
        page: 2,
        name: ' Juana ',
        goal: 'pérdida de peso',
      }).toString(),
    ).toBe('name=Juana&goal=p%C3%A9rdida+de+peso&page=2')
  })

  it('ida y vuelta conserva los filtros', () => {
    const filters = { page: 4, name: 'Juana', goal: 'fuerza' }

    expect(parseAthleteFilters(toAthleteSearchParams(filters))).toEqual(filters)
  })
})
