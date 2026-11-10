import { describe, expect, it } from 'vitest'
import { weightRecord } from '../../test/weight-fixtures'
import {
  emptyWeightFormValues,
  toWeightFormValues,
  toWeightRecordInput,
} from './weight-form-values'

describe('valores del formulario de peso', () => {
  it('el alta arranca con la fecha de hoy y sin peso ni comentario', () => {
    expect(emptyWeightFormValues('2026-11-06')).toEqual({
      date: '2026-11-06',
      weightKg: '',
      comment: '',
    })
  })

  it('la edición se precarga con el registro', () => {
    expect(toWeightFormValues(weightRecord())).toEqual({
      date: '2026-11-06',
      weightKg: '72.5',
      comment: 'En ayunas',
    })
  })

  it('un registro sin comentario se precarga vacío', () => {
    expect(toWeightFormValues(weightRecord({ comment: null })).comment).toBe('')
  })

  it('arma el body con el peso como número y el comentario recortado', () => {
    expect(
      toWeightRecordInput({
        date: '2026-11-06',
        weightKg: ' 72,5 ',
        comment: '  En ayunas ',
      }),
    ).toEqual({ date: '2026-11-06', weightKg: 72.5, comment: 'En ayunas' })
  })

  it('un comentario vacío o con espacios va en null', () => {
    expect(
      toWeightRecordInput({ date: '2026-11-06', weightKg: '80', comment: '  ' })
        .comment,
    ).toBeNull()
  })
})
