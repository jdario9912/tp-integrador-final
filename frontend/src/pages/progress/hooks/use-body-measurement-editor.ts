import { useReducer } from 'react'
import type { BodyMeasurementRecord } from '../../../lib/body-measurements'

// US-45: estado de la tarjeta de medidas, como el del peso: alta o edición, choque de fecha (409)
// y aviso de éxito
export type BodyMeasurementEditorState = {
  // registro que se está editando; null = alta
  editing: BodyMeasurementRecord | null
  // fecha que ya tenía un registro al guardar (409)
  conflictDate: string | null
  // aviso de la última operación exitosa
  notice: string | null
  // al cambiar, el formulario se vuelve a montar con sus valores iniciales
  formVersion: number
}

export type BodyMeasurementEditorAction =
  | { type: 'edit'; record: BodyMeasurementRecord }
  | { type: 'cancel' }
  | { type: 'submit' }
  | { type: 'saved'; notice: string }
  | { type: 'conflict'; date: string }

export const initialBodyMeasurementEditorState: BodyMeasurementEditorState = {
  editing: null,
  conflictDate: null,
  notice: null,
  formVersion: 0,
}

export const bodyMeasurementEditorReducer = (
  state: BodyMeasurementEditorState,
  action: BodyMeasurementEditorAction,
): BodyMeasurementEditorState => {
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
    case 'conflict':
      return { ...state, conflictDate: action.date }
  }
}

export const useBodyMeasurementEditor = () =>
  useReducer(bodyMeasurementEditorReducer, initialBodyMeasurementEditorState)
