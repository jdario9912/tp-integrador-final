import { describe, expect, it } from 'vitest'
import { bodyMeasurementRecord } from '../../../test/body-measurement-fixtures'
import {
  bodyMeasurementEditorReducer,
  initialBodyMeasurementEditorState,
} from './use-body-measurement-editor'

describe('bodyMeasurementEditorReducer', () => {
  it('editar abre el registro y reinicia el formulario', () => {
    const record = bodyMeasurementRecord()

    const state = bodyMeasurementEditorReducer(
      initialBodyMeasurementEditorState,
      {
        type: 'edit',
        record,
      },
    )

    expect(state.editing).toBe(record)
    expect(state.formVersion).toBe(1)
  })

  it('un 409 guarda la fecha en choque y conserva lo cargado; un envío nuevo lo descarta', () => {
    const conflicted = bodyMeasurementEditorReducer(
      initialBodyMeasurementEditorState,
      {
        type: 'conflict',
        date: '2026-11-06',
      },
    )
    expect(conflicted.conflictDate).toBe('2026-11-06')

    const resubmitted = bodyMeasurementEditorReducer(conflicted, {
      type: 'submit',
    })
    expect(resubmitted.conflictDate).toBeNull()
  })

  it('guardar vuelve al alta, con el aviso y el formulario limpio', () => {
    const editing = bodyMeasurementEditorReducer(
      initialBodyMeasurementEditorState,
      {
        type: 'edit',
        record: bodyMeasurementRecord(),
      },
    )

    const saved = bodyMeasurementEditorReducer(editing, {
      type: 'saved',
      notice: 'Guardaste las medidas del 6 de noviembre de 2026.',
    })

    expect(saved.editing).toBeNull()
    expect(saved.notice).toBe(
      'Guardaste las medidas del 6 de noviembre de 2026.',
    )
    expect(saved.formVersion).toBe(editing.formVersion + 1)
  })

  it('cancelar la edición vuelve al alta sin aviso', () => {
    const editing = bodyMeasurementEditorReducer(
      initialBodyMeasurementEditorState,
      {
        type: 'edit',
        record: bodyMeasurementRecord(),
      },
    )

    const cancelled = bodyMeasurementEditorReducer(editing, { type: 'cancel' })

    expect(cancelled.editing).toBeNull()
    expect(cancelled.notice).toBeNull()
  })
})
