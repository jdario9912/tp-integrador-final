import { describe, expect, it } from 'vitest'
import { parseFoodFilters, toFoodSearchParams } from './foods-search-params'

const parse = (query: string) => parseFoodFilters(new URLSearchParams(query))

describe('parseFoodFilters', () => {
  it('sin parámetros arranca en la página 1 y sin búsqueda', () => {
    expect(parse('')).toEqual({ page: 1, name: undefined })
  })

  it('lee la página y el nombre', () => {
    expect(parse('page=3&name=pollo')).toEqual({ page: 3, name: 'pollo' })
  })

  it.each(['abc', '0', '-2', '1.5', ''])(
    'una página inválida (%s) vale 1',
    (page) => {
      expect(parse(`page=${page}`).page).toBe(1)
    },
  )

  it('recorta espacios, descarta el nombre en blanco y lo corta al máximo del backend', () => {
    expect(parse('name=%20%20').name).toBeUndefined()
    expect(parse('name=%20pollo%20').name).toBe('pollo')
    expect(parse(`name=${'a'.repeat(150)}`).name).toHaveLength(100)
  })
})

describe('toFoodSearchParams', () => {
  it('omite la página 1 y el nombre vacío', () => {
    expect(toFoodSearchParams({ page: 1, name: '  ' }).toString()).toBe('')
  })

  it('incluye el nombre y la página', () => {
    expect(
      toFoodSearchParams({ page: 2, name: ' arroz integral ' }).toString(),
    ).toBe('name=arroz+integral&page=2')
  })

  it('ida y vuelta conserva los filtros', () => {
    const filters = { page: 4, name: 'avena' }

    expect(parseFoodFilters(toFoodSearchParams(filters))).toEqual(filters)
  })
})
