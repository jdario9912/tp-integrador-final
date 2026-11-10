import { useReducer } from 'react'
import type { WeightRecord } from '../../../lib/weights'

// estado del formulario de la página: alta o edición, choque de fecha (409) y aviso de éxito
export type WeightEditorState = {
  // registro que se está editando; null = alta
  editing: WeightRecord | null
  // fecha que ya tenía un registro al guardar (409)
  conflictDate: string | null
  // aviso de la última operación exitosa
  notice: string | null
  // al cambiar, el formulario se vuelve a montar con sus valores iniciales
  formVersion: number
}

export type WeightEditorAction =
  | { type: 'edit'; record: WeightRecord }
  | { type: 'cancel' }
  | { type: 'submit' }
  | { type: 'saved'; notice: string }
  | { type: 'conflict'; date: string }

export const initialWeightEditorState: WeightEditorState = {
  editing: null,
  conflictDate: null,
  notice: null,
  formVersion: 0,
}

export const weightEditorReducer = (
  state: WeightEditorState,
  action: WeightEditorAction,
): WeightEditorState => {
  switch (action.type) {
    case 'edit':
      return {
        editing: action.record,
        conflictDate: null,
        notice: null,
        formVersion: state.formVersion + 1,
      }
    case 'cancel':
      return {
        editing: null,
        conflictDate: null,
        notice: null,
        formVersion: state.formVersion + 1,
      }
    // un envío nuevo descarta el choque y el aviso anteriores
    case 'submit':
      return { ...state, conflictDate: null, notice: null }
    // después de guardar se vuelve al alta, con el formulario limpio
    case 'saved':
      return {
        editing: null,
        conflictDate: null,
        notice: action.notice,
        formVersion: state.formVersion + 1,
      }
    // se conservan los valores cargados: el usuario decide si edita el registro existente
    case 'conflict':
      return { ...state, conflictDate: action.date }
  }
}

export const useWeightEditor = () =>
  useReducer(weightEditorReducer, initialWeightEditorState)
