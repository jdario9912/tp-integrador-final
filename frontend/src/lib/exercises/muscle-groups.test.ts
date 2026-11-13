import { describe, expect, it } from 'vitest'
import { muscleGroups } from '../../test/exercise-fixtures'
import {
  findMuscleGroupName,
  groupByRegion,
  isMuscleGroupCode,
  muscleGroupName,
} from './muscle-groups'

describe('isMuscleGroupCode', () => {
  it.each(['CHEST', 'FULL_BODY'])('acepta %s', (code) => {
    expect(isMuscleGroupCode(code)).toBe(true)
  })

  it.each(['chest', 'LEGS', ''])('rechaza %j', (code) => {
    expect(isMuscleGroupCode(code)).toBe(false)
  })
})

describe('groupByRegion', () => {
  it('agrupa por región en orden y con su etiqueta', () => {
    const regions = groupByRegion(muscleGroups)

    expect(regions.map(({ label }) => label)).toEqual([
      'Tren superior',
      'Core',
      'Tren inferior',
      'Cuerpo completo',
    ])
    expect(regions[1].groups.map(({ code }) => code)).toEqual(['ABS'])
    expect(regions[2].groups.map(({ code }) => code)).toEqual([
      'QUADRICEPS',
      'HAMSTRINGS',
      'GLUTES',
      'CALVES',
    ])
  })

  it('omite las regiones sin grupos', () => {
    expect(
      groupByRegion([{ code: 'ABS', name: 'Abdominales', region: 'CORE' }]),
    ).toEqual([
      {
        region: 'CORE',
        label: 'Core',
        groups: [{ code: 'ABS', name: 'Abdominales', region: 'CORE' }],
      },
    ])
  })
})

describe('findMuscleGroupName', () => {
  it('devuelve el nombre del grupo', () => {
    expect(findMuscleGroupName(muscleGroups, 'BACK')).toBe('Espalda')
  })

  it('sin el catálogo cargado no hay nombre', () => {
    expect(findMuscleGroupName(undefined, 'BACK')).toBeUndefined()
  })
})

describe('muscleGroupName', () => {
  it('devuelve el nombre del grupo', () => {
    expect(muscleGroupName(muscleGroups, 'GLUTES')).toBe('Glúteos')
  })

  it('sin el catálogo cargado devuelve el código', () => {
    expect(muscleGroupName(undefined, 'GLUTES')).toBe('GLUTES')
  })
})
