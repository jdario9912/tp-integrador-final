import { describe, expect, it } from 'vitest'
import { weightRecord } from '../../../test/weight-fixtures'
import {
  initialWeightEditorState,
  weightEditorReducer,
  type WeightEditorState,
} from './use-weight-editor'

const record = weightRecord()

const withState = (overrides: Partial<WeightEditorState>) => ({
  ...initialWeightEditorState,
  ...overrides,
})

describe('weightEditorReducer', () => {
  it('arranca en el alta, sin avisos', () => {
    expect(initialWeightEditorState).toEqual({
      editing: null,
      conflictDate: null,
      notice: null,
      formVersion: 0,
    })
  })

  it('editar abre el registro, descarta avisos y vuelve a montar el formulario', () => {
    const state = weightEditorReducer(
      withState({ conflictDate: '2026-11-06', notice: 'Registraste 72,5 kg' }),
      { type: 'edit', record },
    )

    expect(state).toEqual({
      editing: record,
      conflictDate: null,
      notice: null,
      formVersion: 1,
    })
  })

  it('cancelar vuelve al alta', () => {
    const state = weightEditorReducer(
      withState({ editing: record, formVersion: 3 }),
      { type: 'cancel' },
    )

    expect(state).toMatchObject({ editing: null, formVersion: 4 })
  })

  it('un envío nuevo descarta el choque y el aviso, pero no la edición', () => {
    const state = weightEditorReducer(
      withState({
        editing: record,
        conflictDate: '2026-11-05',
        notice: 'Guardaste',
      }),
      { type: 'submit' },
    )

    expect(state).toEqual(withState({ editing: record }))
  })

  it('después de guardar vuelve al alta con el aviso y el formulario limpio', () => {
    const state = weightEditorReducer(
      withState({ editing: record, formVersion: 1 }),
      { type: 'saved', notice: 'Guardaste los cambios' },
    )

    expect(state).toEqual({
      editing: null,
      conflictDate: null,
      notice: 'Guardaste los cambios',
      formVersion: 2,
    })
  })

  it('un choque de fecha conserva el formulario tal como está', () => {
    const state = weightEditorReducer(withState({ formVersion: 2 }), {
      type: 'conflict',
      date: '2026-11-06',
    })

    expect(state).toEqual(
      withState({ conflictDate: '2026-11-06', formVersion: 2 }),
    )
  })
})
