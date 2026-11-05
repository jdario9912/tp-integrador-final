import { describe, expect, it } from 'vitest'
import {
  validateDescription,
  validateExerciseName,
  validateMuscleGroup,
  validateVideoUrl,
} from './validation'

describe('validateExerciseName', () => {
  it.each(['', '   '])('exige el nombre (%j)', (value) => {
    expect(validateExerciseName({ value })).toBe('El nombre es obligatorio')
  })

  it('rechaza más de 100 caracteres sin contar los espacios de los bordes', () => {
    expect(validateExerciseName({ value: 'a'.repeat(101) })).toBe(
      'El nombre admite hasta 100 caracteres',
    )
    expect(
      validateExerciseName({ value: ` ${'a'.repeat(100)} ` }),
    ).toBeUndefined()
  })
})

describe('validateMuscleGroup', () => {
  it('exige el grupo muscular', () => {
    expect(validateMuscleGroup({ value: '' })).toBe(
      'El grupo muscular es obligatorio',
    )
    expect(validateMuscleGroup({ value: 'CHEST' })).toBeUndefined()
  })
})

describe('validateDescription', () => {
  it('acepta vacío y hasta 500 caracteres', () => {
    expect(validateDescription({ value: '' })).toBeUndefined()
    expect(validateDescription({ value: 'a'.repeat(500) })).toBeUndefined()
  })

  it('rechaza más de 500 caracteres', () => {
    expect(validateDescription({ value: 'a'.repeat(501) })).toBe(
      'La descripción admite hasta 500 caracteres',
    )
  })
})

describe('validateVideoUrl', () => {
  it.each(['', '  ', 'https://youtu.be/abc', 'http://example.com/video'])(
    'acepta %j',
    (value) => {
      expect(validateVideoUrl({ value })).toBeUndefined()
    },
  )

  it.each(['youtube.com/watch', 'ftp://example.com', 'javascript:alert(1)'])(
    'rechaza %j',
    (value) => {
      expect(validateVideoUrl({ value })).toBe(
        'Ingresá un link válido que empiece con http:// o https://',
      )
    },
  )

  it('rechaza más de 500 caracteres', () => {
    expect(
      validateVideoUrl({ value: `https://example.com/${'a'.repeat(500)}` }),
    ).toBe('El link admite hasta 500 caracteres')
  })
})
