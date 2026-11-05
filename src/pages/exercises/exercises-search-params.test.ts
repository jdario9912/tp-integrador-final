import { describe, expect, it } from 'vitest'
import {
  parseExerciseFilters,
  toExerciseSearchParams,
} from './exercises-search-params'

const parse = (query: string) =>
  parseExerciseFilters(new URLSearchParams(query))

describe('parseExerciseFilters', () => {
  it('sin parámetros arranca en la página 1 y sin filtros', () => {
    expect(parse('')).toEqual({
      page: 1,
      name: undefined,
      muscleGroup: undefined,
    })
  })

  it('lee la página y los filtros', () => {
    expect(parse('page=3&name=press&muscleGroup=CHEST')).toEqual({
      page: 3,
      name: 'press',
      muscleGroup: 'CHEST',
    })
  })

  it.each(['abc', '0', '-2', '1.5', ''])(
    'una página inválida (%s) vale 1',
    (page) => {
      expect(parse(`page=${page}`).page).toBe(1)
    },
  )

  it.each(['chest', 'LEGS', ''])(
    'ignora un grupo muscular desconocido (%j)',
    (muscleGroup) => {
      expect(parse(`muscleGroup=${muscleGroup}`).muscleGroup).toBeUndefined()
    },
  )

  it('recorta espacios, descarta el nombre en blanco y lo corta al máximo del backend', () => {
    expect(parse('name=%20%20').name).toBeUndefined()
    expect(parse('name=%20press%20').name).toBe('press')
    expect(parse(`name=${'a'.repeat(150)}`).name).toHaveLength(100)
  })
})

describe('toExerciseSearchParams', () => {
  it('omite la página 1 y los filtros vacíos', () => {
    expect(toExerciseSearchParams({ page: 1, name: '  ' }).toString()).toBe('')
  })

  it('incluye los filtros y la página', () => {
    expect(
      toExerciseSearchParams({
        page: 2,
        name: ' press banca ',
        muscleGroup: 'CHEST',
      }).toString(),
    ).toBe('name=press+banca&muscleGroup=CHEST&page=2')
  })

  it('ida y vuelta conserva los filtros', () => {
    const filters = { page: 4, name: 'remo', muscleGroup: 'BACK' as const }

    expect(parseExerciseFilters(toExerciseSearchParams(filters))).toEqual(
      filters,
    )
  })
})
