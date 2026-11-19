import { describe, expect, it } from 'vitest'
import { note } from '../../test/note-fixtures'
import {
  isNoteRead,
  validateNoteContent,
  validateNoteTitle,
} from './note-format'

describe('isNoteRead (US-46)', () => {
  it('es leída solo si tiene readAt', () => {
    expect(isNoteRead(note({ readAt: null }))).toBe(false)
    expect(isNoteRead(note({ readAt: '2026-11-15T10:00:00Z' }))).toBe(true)
  })
})

describe('validateNoteTitle (US-46)', () => {
  it.each(['', '   '])('exige el título: %j', (value) => {
    expect(validateNoteTitle(value)).toBe('El título es obligatorio')
  })

  it('acepta hasta 150 caracteres y rechaza más', () => {
    expect(validateNoteTitle('a'.repeat(150))).toBeUndefined()
    expect(validateNoteTitle('a'.repeat(151))).toBe(
      'El título puede tener hasta 150 caracteres',
    )
  })
})

describe('validateNoteContent (US-46)', () => {
  it('exige el contenido', () => {
    expect(validateNoteContent('  ')).toBe('El contenido es obligatorio')
  })

  it('acepta hasta 2000 caracteres y rechaza más', () => {
    expect(validateNoteContent('a'.repeat(2000))).toBeUndefined()
    expect(validateNoteContent('a'.repeat(2001))).toBe(
      'El contenido puede tener hasta 2000 caracteres',
    )
  })
})
